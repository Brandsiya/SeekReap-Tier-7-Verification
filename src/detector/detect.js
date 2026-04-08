export async function detectContentUsage(item) {
    console.log("🔎 Detecting usage for:", item.work_id);

    // TODO: Replace with real fingerprint detection
    return [
        { url: "https://example.com/video1", confidence: 0.92 }
    ];
}
