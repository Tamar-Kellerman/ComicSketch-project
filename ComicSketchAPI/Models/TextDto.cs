namespace ComicSketchAPI.Models // החליפי את ComicApi בשם הפרויקט שלך
{
    public class TextRequest
    {
        public string? Text { get; set; }
    }

    public class TextResponse
    {
        public string? ProcessedText { get; set; }
    }
}