using Microsoft.Extensions.Logging;
using RecipeHub.BuildingBlocks.Audit;
using RecipeHub.BuildingBlocks.Events;
using RecipeHub.Quiz.Application.Exceptions;
using RecipeHub.Quiz.Application.DTOs;
using RecipeHub.Quiz.Application.Interfaces;
using RecipeHub.Quiz.Domain.Entities;

namespace RecipeHub.Quiz.Application.Services;

public class QuizAttemptService : IQuizAttemptService
{
    private readonly IQuizAttemptRepository _attemptRepository;
    private readonly IQuizRepository _quizRepository;
    private readonly IQuizRecipeClient _recipeClient;
    private readonly IAuditActivityPublisher _auditPublisher;
    private readonly ILogger<QuizAttemptService> _logger;

    public QuizAttemptService(
        IQuizAttemptRepository attemptRepository,
        IQuizRepository quizRepository,
        IQuizRecipeClient recipeClient,
        IAuditActivityPublisher auditPublisher,
        ILogger<QuizAttemptService> logger)
    {
        _attemptRepository = attemptRepository;
        _quizRepository = quizRepository;
        _recipeClient = recipeClient;
        _auditPublisher = auditPublisher;
        _logger = logger;
    }

    private async Task SafePublishAuditAsync(AuditActivityEvent evt)
    {
        try
        {
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(3));
            await _auditPublisher.PublishAsync("quiz", evt, cts.Token);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to publish audit event for action {Action} on {TargetType} {TargetId}", evt.Action, evt.TargetType, evt.TargetId);
        }
    }
    public async Task<StartQuizAttemptResponse> StartAttemptAsync(
        Guid quizId, int versionNumber, Guid userRef, string bearerToken, CancellationToken ct = default)
    {
        var version = await _quizRepository.GetVersionDetailAsync(quizId, versionNumber, ct);
        if (version is null || version.State != "published")
        {
            throw new KeyNotFoundException($"Published quiz '{quizId}' version {versionNumber} was not found.");
        }

        // 1. Idempotency: return active in_progress attempt immediately without blocking on Recipe check
        var existing = await _attemptRepository.GetInProgressAttemptAsync(userRef, version.Id, ct);
        if (existing is not null)
        {
            return new StartQuizAttemptResponse
            {
                AttemptId = existing.PublicId,
                QuizId = version.Quiz.PublicId,
                VersionNumber = version.VersionNumber,
                State = existing.State,
                StartedAt = existing.StartedAt
            };
        }

        // 2. Only validate Recipe eligibility when creating a fresh attempt
        var recipeMeta = await _recipeClient.GetRecipeVersionsAsync(new[] { version.RecipeVersionRef }, bearerToken, ct);
        if (!recipeMeta.TryGetValue(version.RecipeVersionRef, out var meta) || !meta.IsEligible)
        {
            throw new InvalidOperationException("Referenced recipe is no longer eligible or available.");
        }

        // 3. Lock quiz & version to serialize with archiving under transaction
        await using var tx = await _attemptRepository.BeginTransactionAsync(ct);
        try
        {
            var quizLock = await _quizRepository.GetByPublicIdForUpdateAsync(quizId, ct);
            var versionLock = await _quizRepository.GetVersionForUpdateAsync(quizLock!.Id, versionNumber, ct);
            if (versionLock is null || versionLock.State != "published")
            {
                throw new InvalidOperationException("Quiz version is no longer published.");
            }

            var concurrentExisting = await _attemptRepository.GetInProgressAttemptAsync(userRef, versionLock.Id, ct);
            if (concurrentExisting is not null)
            {
                return new StartQuizAttemptResponse
                {
                    AttemptId = concurrentExisting.PublicId,
                    QuizId = version.Quiz.PublicId,
                    VersionNumber = version.VersionNumber,
                    State = concurrentExisting.State,
                    StartedAt = concurrentExisting.StartedAt
                };
            }

            var attempt = new QuizAttempt
            {
                PublicId = Guid.NewGuid(),
                QuizVersionId = versionLock.Id,
                UserRef = userRef,
                State = "in_progress",
                StartedAt = DateTime.UtcNow
            };

            await _attemptRepository.AddAttemptAsync(attempt, ct);
            await _attemptRepository.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);

            return new StartQuizAttemptResponse
            {
                AttemptId = attempt.PublicId,
                QuizId = version.Quiz.PublicId,
                VersionNumber = version.VersionNumber,
                State = attempt.State,
                StartedAt = attempt.StartedAt
            };
        }
        catch (QuizDuplicateAttemptException)
        {
            await tx.RollbackAsync(ct);
            var retryExisting = await _attemptRepository.GetInProgressAttemptAsync(userRef, version.Id, ct);
            if (retryExisting is not null)
            {
                return new StartQuizAttemptResponse
                {
                    AttemptId = retryExisting.PublicId,
                    QuizId = version.Quiz.PublicId,
                    VersionNumber = version.VersionNumber,
                    State = retryExisting.State,
                    StartedAt = retryExisting.StartedAt
                };
            }
            throw;
        }
    }

    public async Task<QuizAttemptResumeDto> GetAttemptForResumeAsync(
        Guid attemptId, Guid userRef, CancellationToken ct = default)
    {
        var attempt = await _attemptRepository.GetByPublicIdAsync(attemptId, ct);
        if (attempt is null)
            throw new KeyNotFoundException($"Attempt '{attemptId}' was not found.");

        if (attempt.UserRef != userRef)
            throw new UnauthorizedAccessException("You are not authorized to access this attempt.");

        return new QuizAttemptResumeDto
        {
            AttemptId = attempt.PublicId,
            QuizId = attempt.QuizVersion.Quiz.PublicId,
            VersionNumber = attempt.QuizVersion.VersionNumber,
            State = attempt.State,
            StartedAt = attempt.StartedAt,
            Questions = attempt.QuizVersion.Questions.OrderBy(q => q.SortOrder).Select(q => new QuestionViewerDto
            {
                Id = q.Id,
                SortOrder = q.SortOrder,
                Content = q.Content,
                Options = q.Options.OrderBy(o => o.SortOrder).Select(o => new OptionViewerDto
                {
                    Id = o.Id,
                    SortOrder = o.SortOrder,
                    Content = o.Content
                }).ToList()
            }).ToList(),
            SavedAnswers = attempt.Answers.Select(a => new SavedAnswerItemDto
            {
                QuestionId = a.QuestionId,
                SelectedOptionId = a.SelectedOptionId
            }).ToList()
        };
    }

    public async Task SaveAnswersAsync(
        Guid attemptId, SubmitAnswersRequest request, Guid userRef, CancellationToken ct = default)
    {
        await using var tx = await _attemptRepository.BeginTransactionAsync(ct);

        var attempt = await _attemptRepository.GetByPublicIdForUpdateAsync(attemptId, ct);
        if (attempt is null)
            throw new KeyNotFoundException($"Attempt '{attemptId}' was not found.");

        if (attempt.UserRef != userRef)
            throw new UnauthorizedAccessException("You are not authorized to modify this attempt.");

        if (attempt.State != "in_progress")
            throw new InvalidOperationException("Cannot save answers for an already submitted attempt.");

        SyncAnswers(attempt, request.Answers);

        await _attemptRepository.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
    }

    public async Task<QuizAttemptResultDto> SubmitAttemptAsync(
        Guid attemptId, SubmitAnswersRequest request, AuditActor actor, CancellationToken ct = default)
    {
        actor.EnsureValid();
        var userRef = actor.Id;
        await using var tx = await _attemptRepository.BeginTransactionAsync(ct);

        var attempt = await _attemptRepository.GetByPublicIdForUpdateAsync(attemptId, ct);
        if (attempt is null)
            throw new KeyNotFoundException($"Attempt '{attemptId}' was not found.");

        if (attempt.UserRef != userRef)
            throw new UnauthorizedAccessException("You are not authorized to submit this attempt.");

        // Idempotency: if already submitted, return persisted result
        if (attempt.State == "submitted")
        {
            return MapToResultDto(attempt);
        }

        // Apply snapshot of answers
        SyncAnswers(attempt, request.Answers);

        // Grade attempt server-side
        var questions = attempt.QuizVersion.Questions.ToList();
        var totalQuestions = questions.Count;
        var correctCount = 0;

        var answerMap = attempt.Answers.ToDictionary(a => a.QuestionId);

        foreach (var q in questions)
        {
            var correctOption = q.Options.FirstOrDefault(o => o.IsCorrect);
            if (correctOption is not null &&
                answerMap.TryGetValue(q.Id, out var ans) &&
                ans.SelectedOptionId.HasValue &&
                ans.SelectedOptionId.Value == correctOption.Id)
            {
                correctCount++;
            }
        }

        var score = totalQuestions > 0
            ? Math.Round((decimal)correctCount / totalQuestions * 100m, 2, MidpointRounding.AwayFromZero)
            : 0.0m;

        var isPassed = score >= attempt.QuizVersion.PassingScore;

        attempt.State = "submitted";
        attempt.Score = score;
        attempt.IsPassed = isPassed;
        attempt.SubmittedAt = DateTime.UtcNow;

        await _attemptRepository.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        await SafePublishAuditAsync(new AuditActivityEvent(
            actor.Id,
            actor.Name,
            actor.Role,
            "quiz.attempt_submitted",
            "quiz_attempt",
            attempt.PublicId,
            $"Nộp bài đánh giá '{attempt.QuizVersion.Quiz.Title}' (v{attempt.QuizVersion.VersionNumber}): điểm {attempt.Score}% ({(attempt.IsPassed == true ? "Đạt" : "Không đạt")})."
        ));

        return MapToResultDto(attempt);
    }

    public async Task<(List<QuizAttemptResultDto> Items, int Total)> GetUserAttemptsAsync(
        Guid userRef, Guid? quizId, int? versionNumber, string? state, int page, int pageSize, CancellationToken ct = default)
    {
        var total = await _attemptRepository.GetUserAttemptsCountAsync(userRef, quizId, versionNumber, state, ct);
        var attempts = await _attemptRepository.GetUserAttemptsAsync(userRef, quizId, versionNumber, state, page, pageSize, ct);

        var items = attempts.Select(MapToResultDto).ToList();
        return (items, total);
    }

    public async Task<QuizAttemptResultDto> GetAttemptResultAsync(
        Guid attemptId, Guid userRef, CancellationToken ct = default)
    {
        var attempt = await _attemptRepository.GetByPublicIdAsync(attemptId, ct);
        if (attempt is null)
            throw new KeyNotFoundException($"Attempt '{attemptId}' was not found.");

        if (attempt.UserRef != userRef)
            throw new UnauthorizedAccessException("You are not authorized to view results of this attempt.");

        if (attempt.State != "submitted")
            throw new InvalidOperationException("Attempt is still in progress. Results are only available after submission.");

        return MapToResultDto(attempt);
    }

    public async Task<(List<QuizResultListItemDto> Items, int Total)> GetManagementResultsAsync(
        Guid? userRef, Guid? quizId, int? versionNumber, Guid actorUserId, string actorRole, int page, int pageSize, CancellationToken ct = default)
    {
        var creatorFilter = actorRole.ToLowerInvariant() == "admin" ? (Guid?)null : actorUserId;
        var total = await _attemptRepository.GetManagementAttemptsCountAsync(userRef, quizId, versionNumber, creatorFilter, ct);
        var attempts = await _attemptRepository.GetManagementAttemptsAsync(userRef, quizId, versionNumber, creatorFilter, page, pageSize, ct);

        var items = attempts.Select(a => new QuizResultListItemDto
        {
            AttemptId = a.PublicId,
            QuizId = a.QuizVersion.Quiz.PublicId,
            QuizCode = a.QuizVersion.Quiz.Code,
            QuizTitle = a.QuizVersion.Quiz.Title,
            VersionNumber = a.QuizVersion.VersionNumber,
            UserRef = a.UserRef,
            State = a.State,
            Score = a.Score,
            IsPassed = a.IsPassed,
            PassingScore = a.QuizVersion.PassingScore,
            StartedAt = a.StartedAt,
            SubmittedAt = a.SubmittedAt
        }).ToList();

        return (items, total);
    }

    public async Task<QuizResultDetailDto> GetManagementResultDetailAsync(
        Guid attemptId, Guid actorUserId, string actorRole, CancellationToken ct = default)
    {
        var attempt = await _attemptRepository.GetByPublicIdAsync(attemptId, ct);
        if (attempt is null)
            throw new KeyNotFoundException($"Attempt '{attemptId}' was not found.");

        if (actorRole.ToLowerInvariant() != "admin" && attempt.QuizVersion.Quiz.CreatedByUserRef != actorUserId)
        {
            throw new UnauthorizedAccessException("You are not authorized to view results for this quiz.");
        }

        var resultDto = MapToResultDto(attempt);
        return new QuizResultDetailDto
        {
            AttemptId = resultDto.AttemptId,
            QuizId = resultDto.QuizId,
            VersionNumber = resultDto.VersionNumber,
            State = resultDto.State,
            Score = resultDto.Score,
            IsPassed = resultDto.IsPassed,
            PassingScore = resultDto.PassingScore,
            StartedAt = resultDto.StartedAt,
            SubmittedAt = resultDto.SubmittedAt,
            Answers = resultDto.Answers,
            UserRef = attempt.UserRef,
            QuizCode = attempt.QuizVersion.Quiz.Code,
            QuizTitle = attempt.QuizVersion.Quiz.Title
        };
    }

    private static void SyncAnswers(QuizAttempt attempt, List<AnswerSubmissionItemDto> incomingAnswers)
    {
        var versionQuestions = attempt.QuizVersion.Questions.ToDictionary(q => q.Id);
        var existingAnswerMap = attempt.Answers.ToDictionary(a => a.QuestionId);

        // Check for duplicate questions in incoming submission
        var duplicateQ = incomingAnswers.GroupBy(a => a.QuestionId).FirstOrDefault(g => g.Count() > 1);
        if (duplicateQ is not null)
        {
            throw new ArgumentException($"Duplicate questionId '{duplicateQ.Key}' in answer submission.");
        }

        foreach (var incoming in incomingAnswers)
        {
            if (!versionQuestions.TryGetValue(incoming.QuestionId, out var question))
            {
                throw new ArgumentException($"Question '{incoming.QuestionId}' does not belong to this quiz version.");
            }

            if (incoming.SelectedOptionId.HasValue)
            {
                var optionBelongs = question.Options.Any(o => o.Id == incoming.SelectedOptionId.Value);
                if (!optionBelongs)
                {
                    throw new ArgumentException($"Selected option '{incoming.SelectedOptionId.Value}' does not belong to question '{incoming.QuestionId}'.");
                }
            }

            if (existingAnswerMap.TryGetValue(incoming.QuestionId, out var existingAns))
            {
                existingAns.SelectedOptionId = incoming.SelectedOptionId;
            }
            else
            {
                attempt.Answers.Add(new QuizAnswer
                {
                    QuestionId = incoming.QuestionId,
                    SelectedOptionId = incoming.SelectedOptionId
                });
            }
        }

        // Fill remaining questions in version as null (unanswered) if not provided
        foreach (var q in versionQuestions.Values)
        {
            if (!existingAnswerMap.ContainsKey(q.Id) && !incomingAnswers.Any(a => a.QuestionId == q.Id))
            {
                attempt.Answers.Add(new QuizAnswer
                {
                    QuestionId = q.Id,
                    SelectedOptionId = null
                });
            }
        }
    }

    private static QuizAttemptResultDto MapToResultDto(QuizAttempt attempt)
    {
        var isSubmitted = attempt.State == "submitted";
        var answersMap = attempt.Answers.ToDictionary(a => a.QuestionId);

        var answerDtos = attempt.QuizVersion.Questions.OrderBy(q => q.SortOrder).Select(q =>
        {
            answersMap.TryGetValue(q.Id, out var ans);
            var selectedOptionId = ans?.SelectedOptionId;
            var correctOption = isSubmitted ? q.Options.FirstOrDefault(o => o.IsCorrect) : null;
            var isCorrect = isSubmitted && correctOption != null && selectedOptionId == correctOption.Id;

            return new AnswerResultDto
            {
                QuestionId = q.Id,
                Content = q.Content,
                Explanation = isSubmitted ? q.Explanation : null,
                SelectedOptionId = selectedOptionId,
                CorrectOptionId = isSubmitted ? correctOption?.Id : null,
                IsCorrect = isCorrect,
                Options = q.Options.OrderBy(o => o.SortOrder).Select(o => new OptionResultDto
                {
                    Id = o.Id,
                    SortOrder = o.SortOrder,
                    Content = o.Content,
                    IsCorrect = isSubmitted && o.IsCorrect
                }).ToList()
            };
        }).ToList();

        return new QuizAttemptResultDto
        {
            AttemptId = attempt.PublicId,
            QuizId = attempt.QuizVersion.Quiz.PublicId,
            VersionNumber = attempt.QuizVersion.VersionNumber,
            State = attempt.State,
            Score = attempt.Score ?? 0.0m,
            IsPassed = attempt.IsPassed ?? false,
            PassingScore = attempt.QuizVersion.PassingScore,
            StartedAt = attempt.StartedAt,
            SubmittedAt = attempt.SubmittedAt,
            Answers = answerDtos
        };
    }
}
