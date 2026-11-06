using Microsoft.Extensions.Logging;
using RecipeHub.BuildingBlocks.Audit;
using RecipeHub.BuildingBlocks.Events;
using RecipeHub.Quiz.Application.DTOs;
using RecipeHub.Quiz.Application.Interfaces;
using RecipeHub.Quiz.Domain.Entities;

namespace RecipeHub.Quiz.Application.Services;

public class QuizService : IQuizService
{
    private readonly IQuizRepository _quizRepository;
    private readonly IQuizRecipeClient _recipeClient;
    private readonly IAuditActivityPublisher _auditPublisher;
    private readonly ILogger<QuizService> _logger;

    public QuizService(
        IQuizRepository quizRepository,
        IQuizRecipeClient recipeClient,
        IAuditActivityPublisher auditPublisher,
        ILogger<QuizService> logger)
    {
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

    public async Task<(List<QuizDto> Items, int Total)> GetManagementQuizzesAsync(
        string? code, string? title, string? state, Guid actorUserId, string actorRole, int page, int pageSize, CancellationToken ct = default)
    {
        Guid? ownerRef = actorRole.ToLowerInvariant() == "admin" ? null : actorUserId;
        var total = await _quizRepository.GetManagementQuizzesCountAsync(code, title, state, ownerRef, ct);
        var quizzes = await _quizRepository.GetManagementQuizzesAsync(code, title, state, ownerRef, page, pageSize, ct);

        var items = quizzes.Select(q => new QuizDto
        {
            QuizId = q.PublicId,
            Code = q.Code,
            Title = q.Title,
            Description = q.Description,
            CreatedByUserRef = q.CreatedByUserRef,
            LatestVersionNumber = q.Versions.Any() ? q.Versions.Max(v => v.VersionNumber) : 0,
            Versions = q.Versions.OrderBy(v => v.VersionNumber).Select(v => new QuizVersionSummaryDto
            {
                VersionId = v.PublicId,
                VersionNumber = v.VersionNumber,
                State = v.State,
                RecipeVersionId = v.RecipeVersionRef,
                PassingScore = v.PassingScore,
                PublishedAt = v.PublishedAt,
                QuestionsCount = v.Questions?.Count ?? 0
            }).ToList()
        }).ToList();

        return (items, total);
    }

    public async Task<QuizManagementDetailDto> GetManagementQuizDetailAsync(
        Guid quizId, int versionNumber, Guid actorUserId, string actorRole, CancellationToken ct = default)
    {
        var version = await _quizRepository.GetVersionDetailAsync(quizId, versionNumber, ct);
        if (version is null)
        {
            throw new KeyNotFoundException($"Quiz '{quizId}' version {versionNumber} was not found.");
        }

        if (actorRole.ToLowerInvariant() != "admin" && version.Quiz.CreatedByUserRef != actorUserId)
        {
            throw new UnauthorizedAccessException("You are not authorized to view this quiz.");
        }

        return MapToDetailDto(version.Quiz, version);
    }

    public async Task<QuizManagementDetailDto> CreateQuizAsync(
        CreateQuizRequest request, AuditActor actor, string bearerToken, CancellationToken ct = default)
    {
        actor.EnsureValid();
        if (string.IsNullOrWhiteSpace(request.Code))
            throw new ArgumentException("Quiz code is required.");
        if (string.IsNullOrWhiteSpace(request.Title))
            throw new ArgumentException("Quiz title is required.");
        if (request.PassingScore <= 0 || request.PassingScore > 100)
            throw new ArgumentException("Passing score must be between 0 and 100.");

        var codeExists = await _quizRepository.CodeExistsAsync(request.Code, ct);
        if (codeExists)
            throw new InvalidOperationException($"Quiz code '{request.Code}' already exists.");

        // Verify RecipeVersion validity
        var recipeMetadata = await _recipeClient.GetRecipeVersionsAsync(new[] { request.RecipeVersionId }, bearerToken, ct);
        if (!recipeMetadata.TryGetValue(request.RecipeVersionId, out var recipe) || !recipe.IsEligible)
        {
            throw new InvalidOperationException("Referenced recipe version is not eligible (must be published and not archived).");
        }

        await using var tx = await _quizRepository.BeginTransactionAsync(ct);

        var quiz = new Domain.Entities.Quiz
        {
            PublicId = Guid.NewGuid(),
            Code = request.Code.Trim(),
            Title = request.Title.Trim(),
            Description = request.Description?.Trim(),
            CreatedByUserRef = actor.Id,
            NextVersionNumber = 2,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var initialVersion = new QuizVersion
        {
            PublicId = Guid.NewGuid(),
            VersionNumber = 1,
            RecipeVersionRef = request.RecipeVersionId,
            PassingScore = request.PassingScore,
            State = "draft",
            CreatedByUserRef = actor.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        if (request.Questions is not null && request.Questions.Count > 0)
        {
            ValidateQuestions(request.Questions);
            foreach (var qDto in request.Questions.OrderBy(q => q.SortOrder))
            {
                var question = new QuizQuestion
                {
                    SortOrder = qDto.SortOrder,
                    Content = qDto.Content.Trim(),
                    Explanation = qDto.Explanation?.Trim()
                };

                foreach (var oDto in qDto.Options.OrderBy(o => o.SortOrder))
                {
                    question.Options.Add(new QuizOption
                    {
                        SortOrder = oDto.SortOrder,
                        Content = oDto.Content.Trim(),
                        IsCorrect = oDto.IsCorrect
                    });
                }

                initialVersion.Questions.Add(question);
            }
        }

        quiz.Versions.Add(initialVersion);
        await _quizRepository.AddQuizAsync(quiz, ct);
        await _quizRepository.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        await SafePublishAuditAsync(new AuditActivityEvent(
            actor.Id,
            actor.Name,
            actor.Role,
            "quiz.created",
            "quiz",
            quiz.PublicId,
            $"Tạo bài kiểm tra '{quiz.Title}' (mã: {quiz.Code})."
        ));

        return MapToDetailDto(quiz, initialVersion);
    }

    public async Task<QuizManagementDetailDto> PatchQuizAsync(
        Guid quizId, int versionNumber, PatchQuizRequest request, AuditActor actor, string bearerToken, CancellationToken ct = default)
    {
        actor.EnsureValid();
        var isStateTransition = request.HasState && !string.IsNullOrWhiteSpace(request.State);
        var hasContentFields = request.HasTitle || request.HasDescription || request.HasRecipeVersionId || request.HasPassingScore || request.HasQuestions;

        if (isStateTransition && hasContentFields)
        {
            throw new ArgumentException("State transition cannot be mixed with content updates in the same request.");
        }

        if (!isStateTransition && !hasContentFields)
        {
            throw new ArgumentException("Empty PATCH request. Specify at least one field to update.");
        }

        await using var tx = await _quizRepository.BeginTransactionAsync(ct);

        // 1. Lock parent quiz first
        var quiz = await _quizRepository.GetByPublicIdForUpdateAsync(quizId, ct);
        if (quiz is null)
            throw new KeyNotFoundException($"Quiz '{quizId}' was not found.");

        if (actor.Role != "admin" && quiz.CreatedByUserRef != actor.Id)
            throw new UnauthorizedAccessException("You are not authorized to update this quiz.");

        // 2. Lock version
        var version = await _quizRepository.GetVersionForUpdateAsync(quiz.Id, versionNumber, ct);
        if (version is null)
            throw new KeyNotFoundException($"Quiz '{quizId}' version {versionNumber} was not found.");

        if (isStateTransition)
        {
            var targetState = request.State!.Trim().ToLowerInvariant();

            // State-only "draft" confirms draft status without publication transition, allowed for owner
            if (targetState == "draft")
            {
                if (version.State != "draft")
                    throw new InvalidOperationException($"Cannot transition state from '{version.State}' back to 'draft'.");

                return MapToDetailDto(quiz, version);
            }

            if (actor.Role != "admin")
                throw new UnauthorizedAccessException("Only admin is authorized to publish or archive quiz versions.");
            if (version.State == "draft")
            {
                if (targetState != "published")
                    throw new InvalidOperationException($"Invalid state transition: draft cannot transition to '{targetState}'. Only 'published' is allowed.");

                // Validate publish preconditions: must have >= 1 question, each 2..6 options, 1 correct
                if (version.Questions.Count == 0)
                    throw new InvalidOperationException("Cannot publish an empty quiz draft. At least 1 question is required.");

                ValidateQuestionsEntity(version.Questions);

                // Verify RecipeVersion is still published and not archived
                var recipeMeta = await _recipeClient.GetRecipeVersionsAsync(new[] { version.RecipeVersionRef }, bearerToken, ct);
                if (!recipeMeta.TryGetValue(version.RecipeVersionRef, out var rMeta) || !rMeta.IsEligible)
                {
                    throw new InvalidOperationException("Referenced recipe version is no longer eligible (must be published and active).");
                }

                version.State = "published";
                version.PublishedAt = DateTime.UtcNow;
                version.UpdatedAt = DateTime.UtcNow;
            }
            else if (version.State == "published")
            {
                if (targetState != "archived")
                    throw new InvalidOperationException($"Invalid state transition: published can only transition to 'archived', not '{targetState}'.");

                version.State = "archived";
                version.UpdatedAt = DateTime.UtcNow;
            }
            else // archived
            {
                throw new InvalidOperationException("Archived quiz versions cannot be modified or published again.");
            }
        }
        else // Content update
        {
            if (version.State != "draft")
                throw new InvalidOperationException($"Cannot modify quiz version in state '{version.State}'. Content updates only allowed for draft.");

            if (request.HasTitle)
            {
                if (string.IsNullOrWhiteSpace(request.Title))
                    throw new ArgumentException("Title cannot be empty.");
                quiz.Title = request.Title.Trim();
                quiz.UpdatedAt = DateTime.UtcNow;
            }

            if (request.HasDescription)
            {
                quiz.Description = request.Description?.Trim();
                quiz.UpdatedAt = DateTime.UtcNow;
            }

            if (request.HasPassingScore)
            {
                if (request.PassingScore is null || request.PassingScore <= 0 || request.PassingScore > 100)
                    throw new ArgumentException("Passing score must be between 0 and 100.");
                version.PassingScore = request.PassingScore.Value;
                version.UpdatedAt = DateTime.UtcNow;
            }

            if (request.HasRecipeVersionId)
            {
                if (request.RecipeVersionId is null || request.RecipeVersionId == Guid.Empty)
                    throw new ArgumentException("Recipe version ID cannot be empty.");

                var recipeMeta = await _recipeClient.GetRecipeVersionsAsync(new[] { request.RecipeVersionId.Value }, bearerToken, ct);
                if (!recipeMeta.TryGetValue(request.RecipeVersionId.Value, out var rMeta) || !rMeta.IsEligible)
                {
                    throw new InvalidOperationException("Referenced recipe version is not eligible (must be published and active).");
                }

                version.RecipeVersionRef = request.RecipeVersionId.Value;
                version.UpdatedAt = DateTime.UtcNow;
            }

            if (request.HasQuestions)
            {
                // Full replacement
                version.Questions.Clear();
                if (request.Questions is not null && request.Questions.Count > 0)
                {
                    ValidateQuestions(request.Questions);
                    foreach (var qDto in request.Questions.OrderBy(q => q.SortOrder))
                    {
                        var question = new QuizQuestion
                        {
                            SortOrder = qDto.SortOrder,
                            Content = qDto.Content.Trim(),
                            Explanation = qDto.Explanation?.Trim()
                        };

                        foreach (var oDto in qDto.Options.OrderBy(o => o.SortOrder))
                        {
                            question.Options.Add(new QuizOption
                            {
                                SortOrder = oDto.SortOrder,
                                Content = oDto.Content.Trim(),
                                IsCorrect = oDto.IsCorrect
                            });
                        }

                        version.Questions.Add(question);
                    }
                }
                version.UpdatedAt = DateTime.UtcNow;
            }
        }

        await _quizRepository.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        string auditAction;
        string auditSummary;
        if (isStateTransition)
        {
            var targetState = request.State!.Trim().ToLowerInvariant();
            if (targetState == "published")
            {
                auditAction = "quiz.published";
                auditSummary = $"Xuất bản bài kiểm tra '{quiz.Title}' (v{version.VersionNumber}).";
            }
            else
            {
                auditAction = "quiz.archived";
                auditSummary = $"Lưu trữ bài kiểm tra '{quiz.Title}' (v{version.VersionNumber}).";
            }
        }
        else
        {
            auditAction = "quiz.updated";
            auditSummary = $"Cập nhật nội dung bài kiểm tra '{quiz.Title}' (v{version.VersionNumber}).";
        }

        await SafePublishAuditAsync(new AuditActivityEvent(
            actor.Id,
            actor.Name,
            actor.Role,
            auditAction,
            "quiz",
            quiz.PublicId,
            auditSummary
        ));

        return MapToDetailDto(quiz, version);
    }

    public async Task DeleteQuizAsync(
        Guid quizId, AuditActor actor, CancellationToken ct = default)
    {
        actor.EnsureValid();
        await using var tx = await _quizRepository.BeginTransactionAsync(ct);

        var quiz = await _quizRepository.GetByPublicIdForUpdateAsync(quizId, ct);
        if (quiz is null)
            throw new KeyNotFoundException($"Quiz '{quizId}' was not found.");

        if (actor.Role != "admin" && quiz.CreatedByUserRef != actor.Id)
            throw new UnauthorizedAccessException("You are not authorized to delete this quiz.");

        // Check: all versions must be draft and have no attempts
        foreach (var v in quiz.Versions)
        {
            if (v.State != "draft")
                throw new InvalidOperationException($"Cannot delete quiz: version {v.VersionNumber} is in state '{v.State}'. Only draft-only quizzes can be deleted.");

            var versionWithAttempts = await _quizRepository.GetVersionForUpdateAsync(quiz.Id, v.VersionNumber, ct);
            if (versionWithAttempts is not null && versionWithAttempts.Attempts.Any())
                throw new InvalidOperationException($"Cannot delete quiz: version {v.VersionNumber} has existing attempt records.");
        }

        await _quizRepository.DeleteQuizAsync(quiz, ct);
        await _quizRepository.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        await SafePublishAuditAsync(new AuditActivityEvent(
            actor.Id,
            actor.Name,
            actor.Role,
            "quiz.deleted",
            "quiz",
            quiz.PublicId,
            $"Xóa bài kiểm tra '{quiz.Title}' (mã: {quiz.Code})."
        ));
    }

    public async Task DeleteDraftVersionAsync(
        Guid quizId, int versionNumber, AuditActor actor, CancellationToken ct = default)
    {
        actor.EnsureValid();
        await using var tx = await _quizRepository.BeginTransactionAsync(ct);

        var quiz = await _quizRepository.GetByPublicIdForUpdateAsync(quizId, ct);
        if (quiz is null)
            throw new KeyNotFoundException($"Quiz '{quizId}' was not found.");

        if (actor.Role != "admin" && quiz.CreatedByUserRef != actor.Id)
            throw new UnauthorizedAccessException("You are not authorized to delete versions of this quiz.");

        if (quiz.Versions.Count <= 1)
        {
            throw new InvalidOperationException("Cannot delete the only version of a quiz. Use DELETE on the entire quiz instead.");
        }

        var version = await _quizRepository.GetVersionForUpdateAsync(quiz.Id, versionNumber, ct);
        if (version is null)
            throw new KeyNotFoundException($"Quiz version {versionNumber} was not found.");

        if (version.State != "draft")
            throw new InvalidOperationException($"Cannot delete version in state '{version.State}'. Only draft versions can be deleted.");

        if (version.Attempts.Any())
            throw new InvalidOperationException("Cannot delete version with existing attempt records.");

        await _quizRepository.DeleteQuizVersionAsync(version, ct);
        await _quizRepository.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        await SafePublishAuditAsync(new AuditActivityEvent(
            actor.Id,
            actor.Name,
            actor.Role,
            "quiz.version_deleted",
            "quiz_version",
            version.PublicId,
            $"Xóa bản nháp v{versionNumber} của bài kiểm tra '{quiz.Title}'."
        ));
    }

    public async Task<QuizManagementDetailDto> CloneQuizVersionAsync(
        Guid quizId, CloneQuizRequest request, AuditActor actor, CancellationToken ct = default)
    {
        actor.EnsureValid();
        if (request.SourceVersion <= 0)
            throw new ArgumentException("Source version must be a positive integer.");

        await using var tx = await _quizRepository.BeginTransactionAsync(ct);

        // 1. Lock parent quiz
        var quiz = await _quizRepository.GetByPublicIdForUpdateAsync(quizId, ct);
        if (quiz is null)
            throw new KeyNotFoundException($"Quiz '{quizId}' was not found.");

        if (actor.Role != "admin" && quiz.CreatedByUserRef != actor.Id)
            throw new UnauthorizedAccessException("You are not authorized to clone this quiz.");

        // 2. Lock source version
        var sourceVersion = await _quizRepository.GetVersionForUpdateAsync(quiz.Id, request.SourceVersion, ct);
        if (sourceVersion is null)
            throw new KeyNotFoundException($"Source version {request.SourceVersion} was not found.");

        var newVersionNumber = quiz.NextVersionNumber;
        quiz.NextVersionNumber += 1;
        quiz.UpdatedAt = DateTime.UtcNow;

        var newVersion = new QuizVersion
        {
            PublicId = Guid.NewGuid(),
            QuizId = quiz.Id,
            VersionNumber = newVersionNumber,
            RecipeVersionRef = sourceVersion.RecipeVersionRef,
            PassingScore = sourceVersion.PassingScore,
            State = "draft",
            CreatedByUserRef = actor.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // Deep copy questions and options with fresh IDs
        foreach (var srcQ in sourceVersion.Questions.OrderBy(q => q.SortOrder))
        {
            var newQ = new QuizQuestion
            {
                SortOrder = srcQ.SortOrder,
                Content = srcQ.Content,
                Explanation = srcQ.Explanation
            };

            foreach (var srcO in srcQ.Options.OrderBy(o => o.SortOrder))
            {
                newQ.Options.Add(new QuizOption
                {
                    SortOrder = srcO.SortOrder,
                    Content = srcO.Content,
                    IsCorrect = srcO.IsCorrect
                });
            }

            newVersion.Questions.Add(newQ);
        }

        quiz.Versions.Add(newVersion);
        await _quizRepository.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        await SafePublishAuditAsync(new AuditActivityEvent(
            actor.Id,
            actor.Name,
            actor.Role,
            "quiz.version_cloned",
            "quiz_version",
            newVersion.PublicId,
            $"Nhân bản v{request.SourceVersion} sang v{newVersionNumber} cho bài kiểm tra '{quiz.Title}'."
        ));

        return MapToDetailDto(quiz, newVersion);
    }

    public async Task<(List<QuizViewerListItemDto> Items, int Total)> GetViewerQuizzesAsync(
        string bearerToken, int page, int pageSize, CancellationToken ct = default)
    {
        var publishedVersions = await _quizRepository.GetPublishedQuizVersionsAsync(ct);
        if (publishedVersions.Count == 0)
        {
            return (new List<QuizViewerListItemDto>(), 0);
        }

        // Validate recipe eligibility in batch
        // Validate recipe eligibility in chunks of <= 100
        var distinctRecipeVersionIds = publishedVersions.Select(v => v.RecipeVersionRef).Distinct().ToList();
        var recipeMeta = new Dictionary<Guid, QuizRecipeMetadata>();
        foreach (var chunk in distinctRecipeVersionIds.Chunk(100))
        {
            var chunkResult = await _recipeClient.GetRecipeVersionsAsync(chunk, bearerToken, ct);
            foreach (var kvp in chunkResult)
            {
                recipeMeta[kvp.Key] = kvp.Value;
            }
        }

        // Filter eligible
        var eligibleVersions = publishedVersions
            .Where(v => recipeMeta.TryGetValue(v.RecipeVersionRef, out var meta) && meta.IsEligible)
            .ToList();

        var total = eligibleVersions.Count;
        var paged = eligibleVersions
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(v => new QuizViewerListItemDto
            {
                QuizId = v.Quiz.PublicId,
                Code = v.Quiz.Code,
                Title = v.Quiz.Title,
                Description = v.Quiz.Description,
                VersionNumber = v.VersionNumber,
                RecipeVersionId = v.RecipeVersionRef,
                RecipeTitle = recipeMeta[v.RecipeVersionRef].Title,
                PassingScore = v.PassingScore,
                QuestionsCount = v.Questions.Count
            }).ToList();

        return (paged, total);
    }

    public async Task<QuizViewerPreviewDto> GetViewerQuizPreviewAsync(
        Guid quizId, int versionNumber, string bearerToken, CancellationToken ct = default)
    {
        var version = await _quizRepository.GetVersionDetailAsync(quizId, versionNumber, ct);
        if (version is null || version.State != "published")
        {
            throw new KeyNotFoundException($"Published quiz '{quizId}' version {versionNumber} was not found.");
        }

        // Validate Recipe eligibility
        var recipeMeta = await _recipeClient.GetRecipeVersionsAsync(new[] { version.RecipeVersionRef }, bearerToken, ct);
        if (!recipeMeta.TryGetValue(version.RecipeVersionRef, out var meta) || !meta.IsEligible)
        {
            throw new KeyNotFoundException($"Quiz recipe reference is currently unavailable.");
        }

        return new QuizViewerPreviewDto
        {
            QuizId = version.Quiz.PublicId,
            Code = version.Quiz.Code,
            Title = version.Quiz.Title,
            Description = version.Quiz.Description,
            VersionNumber = version.VersionNumber,
            RecipeVersionId = version.RecipeVersionRef,
            RecipeTitle = meta.Title,
            PassingScore = version.PassingScore,
            QuestionsCount = version.Questions.Count,
            Questions = version.Questions.OrderBy(q => q.SortOrder).Select(q => new QuestionViewerDto
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
            }).ToList()
        };
    }

    private static void ValidateQuestions(List<QuestionManagementDto> questions)
    {
        if (questions.Count > 100)
            throw new ArgumentException("A quiz version cannot exceed 100 questions.");

        var sortOrders = new HashSet<int>();
        foreach (var q in questions)
        {
            if (string.IsNullOrWhiteSpace(q.Content))
                throw new ArgumentException("Question content cannot be empty.");
            if (q.SortOrder <= 0)
                throw new ArgumentException("Question sortOrder must be positive.");
            if (!sortOrders.Add(q.SortOrder))
                throw new ArgumentException($"Duplicate question sortOrder '{q.SortOrder}'.");

            if (q.Options.Count < 2 || q.Options.Count > 6)
                throw new ArgumentException($"Question '{q.SortOrder}' must have between 2 and 6 options.");

            var correctCount = q.Options.Count(o => o.IsCorrect);
            if (correctCount != 1)
                throw new ArgumentException($"Question '{q.SortOrder}' must have exactly one correct option.");

            var optSortOrders = new HashSet<int>();
            foreach (var opt in q.Options)
            {
                if (string.IsNullOrWhiteSpace(opt.Content))
                    throw new ArgumentException($"Question '{q.SortOrder}' has an option with empty content.");
                if (opt.SortOrder <= 0)
                    throw new ArgumentException($"Question '{q.SortOrder}' option sortOrder must be positive.");
                if (!optSortOrders.Add(opt.SortOrder))
                    throw new ArgumentException($"Question '{q.SortOrder}' has duplicate option sortOrder '{opt.SortOrder}'.");
            }
        }
    }

    private static void ValidateQuestionsEntity(IEnumerable<QuizQuestion> questions)
    {
        foreach (var q in questions)
        {
            if (q.Options.Count < 2 || q.Options.Count > 6)
                throw new InvalidOperationException($"Question '{q.SortOrder}' has {q.Options.Count} options. Must be 2..6.");
            if (q.Options.Count(o => o.IsCorrect) != 1)
                throw new InvalidOperationException($"Question '{q.SortOrder}' must have exactly one correct option.");
        }
    }

    private static QuizManagementDetailDto MapToDetailDto(Domain.Entities.Quiz quiz, QuizVersion version)
    {
        return new QuizManagementDetailDto
        {
            QuizId = quiz.PublicId,
            Code = quiz.Code,
            Title = quiz.Title,
            Description = quiz.Description,
            CreatedByUserRef = quiz.CreatedByUserRef,
            Version = new QuizVersionDetailDto
            {
                VersionId = version.PublicId,
                VersionNumber = version.VersionNumber,
                State = version.State,
                RecipeVersionId = version.RecipeVersionRef,
                PassingScore = version.PassingScore,
                PublishedAt = version.PublishedAt,
                Questions = version.Questions.OrderBy(q => q.SortOrder).Select(q => new QuestionManagementDto
                {
                    Id = q.Id,
                    SortOrder = q.SortOrder,
                    Content = q.Content,
                    Explanation = q.Explanation,
                    Options = q.Options.OrderBy(o => o.SortOrder).Select(o => new OptionManagementDto
                    {
                        Id = o.Id,
                        SortOrder = o.SortOrder,
                        Content = o.Content,
                        IsCorrect = o.IsCorrect
                    }).ToList()
                }).ToList()
            }
        };
    }
}
