using System.Text.Json;
using RecipeHub.Quiz.Application.DTOs;
using RecipeHub.Quiz.Application.Exceptions;

namespace RecipeHub.Quiz.Infrastructure.Ai;

internal static class GeminiQuizResponseParser
{
    public const string ResponseSchemaJson = """{"type":"object","properties":{"questions":{"type":"array","items":{"type":"object","properties":{"content":{"type":"string"},"explanation":{"type":"string"},"options":{"type":"array","items":{"type":"object","properties":{"content":{"type":"string"},"isCorrect":{"type":"boolean"}},"required":["content","isCorrect"]}}},"required":["content","explanation","options"]}}},"required":["questions"]}""";

    public static List<QuestionManagementDto> Parse(string responseBody, int count)
    {
        var result = new List<QuestionManagementDto>();
        try
        {
            using var document = JsonDocument.Parse(responseBody);
            if (!TryGetFirstCandidate(document.RootElement, out var candidate))
            {
                throw new QuizDependencyException("AI không trả về nội dung câu hỏi.");
            }
            if (IsTokenBudgetExceeded(candidate))
            {
                throw new QuizDependencyException("AI trả về chưa đủ nội dung, vui lòng giảm số câu và thử lại.");
            }

            var text = ReadCandidateText(candidate);
            if (string.IsNullOrWhiteSpace(text))
            {
                throw new QuizDependencyException("AI không trả về nội dung câu hỏi.");
            }

            using var payload = JsonDocument.Parse(text);
            if (!payload.RootElement.TryGetProperty("questions", out var questions) || questions.ValueKind != JsonValueKind.Array)
            {
                throw new QuizDependencyException("Phản hồi của AI thiếu danh sách câu hỏi.");
            }

            foreach (var element in questions.EnumerateArray())
            {
                var question = MapQuestion(element, result.Count + 1);
                if (question is not null) result.Add(question);
                if (result.Count == count) break;
            }
        }
        catch (JsonException ex)
        {
            throw new QuizDependencyException("Phản hồi của AI không đúng định dạng JSON.", ex);
        }

        return result.Count > 0 ? result : throw new QuizDependencyException("AI không trả về câu hỏi hợp lệ. Vui lòng thử lại.");
    }

    private static bool TryGetFirstCandidate(JsonElement root, out JsonElement candidate)
    {
        candidate = default;
        if (!root.TryGetProperty("candidates", out var candidates)
            || candidates.ValueKind != JsonValueKind.Array
            || candidates.GetArrayLength() == 0)
        {
            return false;
        }

        candidate = candidates[0];
        return true;
    }

    private static bool IsTokenBudgetExceeded(JsonElement candidate) =>
        candidate.ValueKind == JsonValueKind.Object
        && candidate.TryGetProperty("finishReason", out var finishReason)
        && finishReason.ValueKind == JsonValueKind.String
        && string.Equals(finishReason.GetString(), "MAX_TOKENS", StringComparison.OrdinalIgnoreCase);

    private static string ReadCandidateText(JsonElement candidate)
    {
        if (!candidate.TryGetProperty("content", out var content)
            || !content.TryGetProperty("parts", out var parts)
            || parts.ValueKind != JsonValueKind.Array)
        {
            return string.Empty;
        }

        return string.Concat(parts.EnumerateArray().Select(part =>
            part.ValueKind == JsonValueKind.Object && part.TryGetProperty("text", out var text) && text.ValueKind == JsonValueKind.String
                ? text.GetString()
                : null));
    }

    private static QuestionManagementDto? MapQuestion(JsonElement element, int sortOrder)
    {
        var content = ReadString(element, "content");
        if (string.IsNullOrWhiteSpace(content)
            || !element.TryGetProperty("options", out var options)
            || options.ValueKind != JsonValueKind.Array)
        {
            return null;
        }

        var mapped = options.EnumerateArray()
            .Select(option => new
            {
                Content = ReadString(option, "content")?.Trim(),
                IsCorrect = option.TryGetProperty("isCorrect", out var flag) && flag.ValueKind == JsonValueKind.True
            })
            .Where(option => !string.IsNullOrWhiteSpace(option.Content))
            .Select(option => new OptionManagementDto { Content = option.Content!, IsCorrect = option.IsCorrect })
            .ToList();
        if (mapped.Count != 4 || mapped.Count(option => option.IsCorrect) != 1)
        {
            return null;
        }

        Shuffle(mapped);
        for (var i = 0; i < mapped.Count; i++) mapped[i].SortOrder = i + 1;

        var explanation = ReadString(element, "explanation");
        return new QuestionManagementDto
        {
            SortOrder = sortOrder,
            Content = content.Trim(),
            Explanation = string.IsNullOrWhiteSpace(explanation) ? null : explanation.Trim(),
            Options = mapped
        };
    }

    private static string? ReadString(JsonElement element, string propertyName) =>
        element.TryGetProperty(propertyName, out var value) && value.ValueKind == JsonValueKind.String ? value.GetString() : null;

    private static void Shuffle<T>(List<T> items)
    {
        for (var i = items.Count - 1; i > 0; i--)
        {
            var j = Random.Shared.Next(i + 1);
            (items[i], items[j]) = (items[j], items[i]);
        }
    }
}
