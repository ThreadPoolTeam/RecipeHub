using System.Globalization;
using System.Text;
using RecipeHub.Quiz.Application.Interfaces;

namespace RecipeHub.Quiz.Infrastructure.Ai;

public static class QuizAiPromptBuilder
{
    public static string BuildSystemInstruction(int count)
    {
        var sb = new StringBuilder();
        sb.AppendLine("Bạn là chuyên gia đào tạo R&D của chuỗi đồ uống, soạn câu hỏi trắc nghiệm để kiểm tra nhân sự nắm quy trình pha chế.");
        sb.AppendLine($"Hãy tạo đúng {count} câu hỏi trắc nghiệm tiếng Việt, chỉ dựa trên dữ liệu công thức được cung cấp.");
        sb.AppendLine("Yêu cầu bắt buộc:");
        sb.AppendLine("- Chỉ hỏi nội dung có trong dữ liệu công thức, không thêm kiến thức bên ngoài.");
        sb.AppendLine("- Đa dạng loại câu: định lượng nguyên liệu, thứ tự bước, nhiệt độ và thời gian, dụng cụ, tiêu chí hoàn thành, an toàn.");
        sb.AppendLine("- Mỗi câu có đúng 4 lựa chọn và đúng 1 lựa chọn đúng.");
        sb.AppendLine("- Lựa chọn sai phải hợp lý, gần với đáp án đúng nhưng rõ ràng là sai.");
        sb.AppendLine("- Mỗi câu có lời giải thích ngắn gọn, nêu căn cứ trong công thức.");
        sb.AppendLine("- Không lặp ý giữa các câu trong cùng đề.");
        sb.AppendLine("- Không lặp ý với danh sách câu hỏi đã có nếu được cung cấp.");
        sb.AppendLine("- Không dùng dấu gạch ngang dài trong nội dung câu hỏi, lựa chọn và lời giải thích.");
        sb.AppendLine("- Trả về JSON đúng theo schema, không kèm văn bản ngoài JSON.");
        return sb.ToString().TrimEnd();
    }

    public static string BuildRecipeContent(QuizAiInput input)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"Tên công thức: {input.RecipeTitle}");
        if (!string.IsNullOrWhiteSpace(input.CategoryName))
        {
            sb.AppendLine($"Danh mục: {input.CategoryName.Trim()}");
        }
        if (!string.IsNullOrWhiteSpace(input.Description))
        {
            sb.AppendLine($"Mô tả: {input.Description.Trim()}");
        }

        sb.AppendLine();
        sb.AppendLine("Nguyên liệu:");
        if (input.Ingredients.Count == 0)
        {
            sb.AppendLine("- Không có dữ liệu nguyên liệu.");
        }
        else
        {
            foreach (var item in input.Ingredients)
            {
                var line = new StringBuilder($"- {item.Name}: {FormatNumber(item.Quantity)} {item.UnitName}".TrimEnd());
                if (!string.IsNullOrWhiteSpace(item.StageName))
                {
                    line.Append(CultureInfo.InvariantCulture, $" (công đoạn: {item.StageName.Trim()})");
                }
                if (!string.IsNullOrWhiteSpace(item.Note))
                {
                    line.Append(CultureInfo.InvariantCulture, $", ghi chú: {item.Note.Trim()}");
                }
                sb.AppendLine(line.ToString());
            }
        }

        sb.AppendLine();
        sb.AppendLine("Các bước thực hiện:");
        if (input.Steps.Count == 0)
        {
            sb.AppendLine("- Không có dữ liệu bước thực hiện.");
        }
        else
        {
            foreach (var step in input.Steps)
            {
                sb.AppendLine(DescribeStep(step));
            }
        }

        sb.AppendLine();
        sb.AppendLine($"Số câu hỏi cần tạo: {input.Count}");

        if (input.ExistingQuestions.Count > 0)
        {
            sb.AppendLine();
            sb.AppendLine("Câu hỏi đã có trong đề, không được lặp ý:");
            for (var i = 0; i < input.ExistingQuestions.Count; i++)
            {
                sb.AppendLine($"{i + 1}. {input.ExistingQuestions[i].Trim()}");
            }
        }

        return sb.ToString().TrimEnd();
    }

    private static string DescribeStep(QuizAiStep step)
    {
        var sb = new StringBuilder($"- Bước {step.SortOrder}");
        if (!string.IsNullOrWhiteSpace(step.Title))
        {
            sb.Append(CultureInfo.InvariantCulture, $": {step.Title.Trim()}");
        }
        if (!string.IsNullOrWhiteSpace(step.Description))
        {
            sb.Append(CultureInfo.InvariantCulture, $". {step.Description.Trim()}");
        }
        if (step.DurationSeconds is > 0)
        {
            sb.Append(CultureInfo.InvariantCulture, $". Thời gian: {FormatDuration(step.DurationSeconds.Value)}");
        }
        if (step.TemperatureCelsius.HasValue)
        {
            sb.Append(CultureInfo.InvariantCulture, $". Nhiệt độ: {FormatNumber(step.TemperatureCelsius.Value)} °C");
        }
        if (!string.IsNullOrWhiteSpace(step.Equipment))
        {
            sb.Append(CultureInfo.InvariantCulture, $". Dụng cụ: {step.Equipment.Trim()}");
        }
        if (!string.IsNullOrWhiteSpace(step.CompletionCriteria))
        {
            sb.Append(CultureInfo.InvariantCulture, $". Tiêu chí hoàn thành: {step.CompletionCriteria.Trim()}");
        }
        if (!string.IsNullOrWhiteSpace(step.SafetyNote))
        {
            sb.Append(CultureInfo.InvariantCulture, $". An toàn: {step.SafetyNote.Trim()}");
        }
        return sb.ToString();
    }

    private static string FormatDuration(int totalSeconds)
    {
        if (totalSeconds < 60)
        {
            return $"{totalSeconds} giây";
        }

        var minutes = totalSeconds / 60;
        var seconds = totalSeconds % 60;
        return seconds == 0
            ? $"{minutes} phút"
            : $"{minutes} phút {seconds} giây";
    }

    private static string FormatNumber(double value) =>
        value.ToString("0.###", CultureInfo.InvariantCulture);
}
