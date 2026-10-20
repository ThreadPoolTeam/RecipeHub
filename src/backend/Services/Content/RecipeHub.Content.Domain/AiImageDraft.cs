namespace RecipeHub.Content.Domain;

public sealed class AiImageDraft
{
    public const string TargetKindFinalProduct = "final_product";
    public const string TargetKindStepInstruction = "step_instruction";

    public const string StateQueued = "queued";
    public const string StateProcessing = "processing";
    public const string StateGenerated = "generated";
    public const string StateFailed = "failed";
    public const string StateAccepting = "accepting";
    public const string StateAccepted = "accepted";
    public const string StateDiscarded = "discarded";
    public const string StateExpired = "expired";

    public const string DefaultProvider = "CloudflareSchnell";
    public const string DefaultModel = "@cf/black-forest-labs/flux-1-schnell";
    public const string DefaultGeometryMode = "native";

    public long Id { get; set; }
    public Guid PublicId { get; set; } = Guid.NewGuid();
    public Guid RecipeVersionRef { get; set; }
    public Guid? RecipeStepRef { get; set; }
    public string TargetKind { get; set; } = TargetKindFinalProduct;
    public string? UserBrief { get; set; }
    public string InputSnapshot { get; set; } = "{}";
    public string? PromptSnapshot { get; set; }
    public string Provider { get; set; } = DefaultProvider;
    public string Model { get; set; } = DefaultModel;
    public string GeometryMode { get; set; } = DefaultGeometryMode;
    public int? Width { get; set; }
    public int? Height { get; set; }
    public string State { get; set; } = StateQueued;
    public string? TemporaryImagePath { get; set; }
    public string? MimeType { get; set; }
    public long? ByteSize { get; set; }
    public string? ErrorCode { get; set; }
    public string? ErrorMessage { get; set; }
    public int AttemptCount { get; set; }
    public Guid? LeaseToken { get; set; }
    public DateTimeOffset? LeaseExpiresAt { get; set; }
    public Guid CreatedByUserRef { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? GeneratedAt { get; set; }
    public DateTimeOffset? ExpiresAt { get; set; }
    public DateTimeOffset? DecidedAt { get; set; }
    public Guid? DecidedByUserRef { get; set; }

    public bool IsExpired => ExpiresAt.HasValue && ExpiresAt.Value <= DateTimeOffset.UtcNow;

    public void StartProcessing(Guid leaseToken, TimeSpan leaseDuration)
    {
        if (State == StateAccepted || State == StateDiscarded)
        {
            throw new InvalidOperationException($"Cannot process draft in '{State}' state.");
        }

        State = StateProcessing;
        LeaseToken = leaseToken;
        LeaseExpiresAt = DateTimeOffset.UtcNow.Add(leaseDuration);
        AttemptCount++;
    }

    public void MarkGenerated(
        string promptSnapshot,
        string temporaryImagePath,
        string mimeType,
        long byteSize,
        int width,
        int height,
        TimeSpan expiryDuration)
    {
        if (State != StateProcessing)
        {
            throw new InvalidOperationException($"Cannot transition to 'generated' from '{State}'.");
        }

        PromptSnapshot = promptSnapshot;
        TemporaryImagePath = temporaryImagePath;
        MimeType = mimeType;
        ByteSize = byteSize;
        Width = width;
        Height = height;
        GeneratedAt = DateTimeOffset.UtcNow;
        ExpiresAt = GeneratedAt.Value.Add(expiryDuration);
        State = StateGenerated;
        LeaseToken = null;
        LeaseExpiresAt = null;
        ErrorCode = null;
        ErrorMessage = null;
    }

    public void MarkFailed(string errorCode, string errorMessage)
    {
        State = StateFailed;
        ErrorCode = errorCode;
        ErrorMessage = errorMessage;
        LeaseToken = null;
        LeaseExpiresAt = null;
    }

    public void StartAccepting(Guid leaseToken, TimeSpan leaseDuration)
    {
        if (State != StateGenerated)
        {
            throw new InvalidOperationException($"Draft must be in 'generated' state to accept, current state: '{State}'.");
        }

        if (IsExpired)
        {
            State = StateExpired;
            throw new InvalidOperationException("Draft preview has expired (30-minute window).");
        }

        State = StateAccepting;
        LeaseToken = leaseToken;
        LeaseExpiresAt = DateTimeOffset.UtcNow.Add(leaseDuration);
    }

    public void RevertAcceptingToGenerated()
    {
        if (State == StateAccepting)
        {
            State = StateGenerated;
            LeaseToken = null;
            LeaseExpiresAt = null;
        }
    }

    public void MarkAccepted(Guid decidedByUserRef)
    {
        if (State != StateAccepting && State != StateGenerated)
        {
            throw new InvalidOperationException($"Cannot accept draft in '{State}' state.");
        }

        State = StateAccepted;
        DecidedAt = DateTimeOffset.UtcNow;
        DecidedByUserRef = decidedByUserRef;
        TemporaryImagePath = null;
        LeaseToken = null;
        LeaseExpiresAt = null;
    }

    public void MarkDiscarded(Guid decidedByUserRef)
    {
        if (State == StateAccepted)
        {
            throw new InvalidOperationException("Cannot discard an already accepted draft.");
        }

        State = StateDiscarded;
        DecidedAt = DateTimeOffset.UtcNow;
        DecidedByUserRef = decidedByUserRef;
        TemporaryImagePath = null;
        LeaseToken = null;
        LeaseExpiresAt = null;
    }

    public void MarkExpired()
    {
        State = StateExpired;
        TemporaryImagePath = null;
        LeaseToken = null;
        LeaseExpiresAt = null;
    }
}
