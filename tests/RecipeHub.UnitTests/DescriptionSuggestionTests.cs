using RecipeHub.Recipe.Api;
using Xunit;

namespace RecipeHub.UnitTests;

public class DescriptionSuggestionTests
{
    [Fact]
    public void RemovesControlCharactersBeforeTruncation()
    {
        var result = DescriptionSuggestion.Clean("Trà\n" + new string('a', 400) + "\0");
        Assert.Equal("Trà" + new string('a', 397), result);
    }

    [Fact]
    public void DoesNotCutSurrogatePair()
    {
        var result = DescriptionSuggestion.Clean(new string('a', 399) + "😀");
        Assert.Equal(new string('a', 399), result);
    }
}
