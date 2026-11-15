using Microsoft.Extensions.Logging;
using RecipeHub.BuildingBlocks.Audit;
using RecipeHub.BuildingBlocks.Events;
using RecipeHub.Quiz.Application.DTOs;
using RecipeHub.Quiz.Application.Exceptions;
using RecipeHub.Quiz.Application.Models;
using RecipeHub.Quiz.Application.Interfaces;
using RecipeHub.Quiz.Domain.Entities;

namespace RecipeHub.Quiz.Application.Services;

public sealed class QuizAiQuizWriter
{
    private static readonly char[] CodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".ToCharArray();

    private readonly IQuizRepository _quizRepository;
    private readonly IAuditActivityPublisher _auditPublisher;
    private readonly ILogger<QuizAiQuizWriter> _logger;

    public QuizAiQuizWriter(
        IQuizRepository quizRepository,
        IAuditActivityPublisher auditPublisher,
        ILogger<QuizAiQuizWriter> logger)
    {
        _quizRepository = quizRepository;
        _auditPublisher = auditPublisher;
        _logger = logger;
    }

    public async Task<(Guid QuizId, int VersionNumber, int QuestionsAdded)> CreateQuizAsync(
        QuizAiJob job, List<QuestionManagementDto> questions, CancellationToken ct)
    {
        QuizService.ValidateQuestions(questions);

        await using var tx = await _quizRepository.BeginTransactionAsync(ct);
        var quiz = new Domain.Entities.Quiz
        {
            PublicId = Guid.NewGuid(),
            Code = await GenerateUniqueCodeAsync(ct),
            Title = $"Kiểm tra SOP: {job.RecipeTitle}".Trim(),
            CreatedByUserRef = job.RequestedByUserId,
            NextVersionNumber = 2,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var version = new QuizVersion
        {
            PublicId = Guid.NewGuid(),
            VersionNumber = 1,
            RecipeVersionRef = job.RecipeVersionId,
            PassingScore = 80.0m,
            State = "draft",
            CreatedByUserRef = job.RequestedByUserId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var sortOrder = 1;
        foreach (var question in questions)
        {
            version.Questions.Add(MapQuestion(question, sortOrder++));
        }

        quiz.Versions.Add(version);
        await _quizRepository.AddQuizAsync(quiz, ct);
        await _quizRepository.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        await PublishAuditAsync(job, "quiz.created", quiz.PublicId, $"Tạo bài kiểm tra '{quiz.Title}' bằng AI (mã: {quiz.Code}).");
        return (quiz.PublicId, version.VersionNumber, questions.Count);
    }

    public async Task<(Guid QuizId, int VersionNumber, int QuestionsAdded)> AppendQuestionsAsync(
        QuizAiJob job, List<QuestionManagementDto> questions, CancellationToken ct)
    {
        if (job.QuizId is null || job.VersionNumber is null)
        {
            throw new QuizConflictException("Tác vụ thiếu thông tin đề cần bổ sung câu hỏi.");
        }

        QuizService.ValidateQuestions(questions);

        await using var tx = await _quizRepository.BeginTransactionAsync(ct);
        var quiz = await _quizRepository.GetByPublicIdForUpdateAsync(job.QuizId.Value, ct)
            ?? throw new KeyNotFoundException("Không tìm thấy đề cần bổ sung câu hỏi.");
        var version = await _quizRepository.GetVersionForUpdateAsync(quiz.Id, job.VersionNumber.Value, ct)
            ?? throw new KeyNotFoundException("Không tìm thấy phiên bản đề cần bổ sung câu hỏi.");

        if (version.State != "draft")
        {
            throw new QuizConflictException("Chỉ có thể tạo thêm câu hỏi cho đề đang ở trạng thái nháp.");
        }

        var remaining = QuizAiJobRules.MaxQuestionsPerQuiz - version.Questions.Count;
        if (remaining <= 0)
        {
            throw new QuizConflictException("Đề đã đủ 50 câu, không thể tạo thêm.");
        }

        var toAdd = Math.Min(remaining, questions.Count);
        var sortOrder = version.Questions.Count == 0 ? 1 : version.Questions.Max(q => q.SortOrder) + 1;
        foreach (var question in questions.Take(toAdd))
        {
            version.Questions.Add(MapQuestion(question, sortOrder++));
        }

        version.UpdatedAt = DateTime.UtcNow;
        quiz.UpdatedAt = DateTime.UtcNow;
        await _quizRepository.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        await PublishAuditAsync(job, "quiz.updated", quiz.PublicId, $"Cập nhật bài kiểm tra '{quiz.Title}' bằng AI (v{version.VersionNumber}).");
        return (quiz.PublicId, version.VersionNumber, toAdd);
    }

    private static QuizQuestion MapQuestion(QuestionManagementDto dto, int sortOrder)
    {
        var question = new QuizQuestion
        {
            SortOrder = sortOrder,
            Content = dto.Content.Trim(),
            Explanation = dto.Explanation?.Trim()
        };

        var optionSortOrder = 1;
        foreach (var option in dto.Options)
        {
            question.Options.Add(new QuizOption
            {
                SortOrder = optionSortOrder++,
                Content = option.Content.Trim(),
                IsCorrect = option.IsCorrect
            });
        }

        return question;
    }

    private async Task<string> GenerateUniqueCodeAsync(CancellationToken ct)
    {
        for (var attempt = 0; attempt < 10; attempt++)
        {
            var suffix = new string(Enumerable.Range(0, 6).Select(_ => CodeAlphabet[Random.Shared.Next(CodeAlphabet.Length)]).ToArray());
            var code = $"QZ-AI-{suffix}";
            if (!await _quizRepository.CodeExistsAsync(code, ct))
            {
                return code;
            }
        }

        throw new QuizConflictException("Không sinh được mã đề duy nhất, vui lòng thử lại.");
    }

    private async Task PublishAuditAsync(QuizAiJob job, string action, Guid quizId, string summary)
    {
        try
        {
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(3));
            await _auditPublisher.PublishAsync("quiz", new AuditActivityEvent(
                job.RequestedByUserId,
                job.RequestedByName,
                job.RequestedByRole,
                action,
                "quiz",
                quizId,
                summary), cts.Token);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Không gửi được sự kiện audit {Action} cho đề {QuizId}.", action, quizId);
        }
    }
}
