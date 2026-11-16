using RecipeHub.Quiz.Application.Models;

namespace RecipeHub.Quiz.Application.Interfaces;

public interface IQuizAiJobQueue
{
    Task EnqueueAsync(QuizAiJobPayload payload, CancellationToken ct = default);
}
