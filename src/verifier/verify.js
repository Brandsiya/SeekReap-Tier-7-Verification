export async function verifyUsage(match) {
    if (match.confidence >= 0.9) return { status: "verified" };
    if (match.confidence >= 0.7) return { status: "suspicious" };
    return { status: "unverified" };
}
