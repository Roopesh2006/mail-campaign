/**
 * Generates a compliant raw RFC 2822 email message and encodes it to base64url format
 * suitable for the Gmail API.
 */
export function buildRawEmail(to: string, subject: string, body: string): string {
  // UTF-8 friendly Base64 encoding for the Subject line to handle special characters or casing cleanly
  const encodedSubject = btoa(
    encodeURIComponent(subject).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    )
  );

  const emailContent = [
    `To: ${to}`,
    `Subject: =?utf-8?B?${encodedSubject}?=`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=\"UTF-8\"",
    "Content-Transfer-Encoding: 8bit",
    "",
    body,
  ].join("\r\n");

  // Perform base64url conversion safely supporting UTF-8 characters
  const utf8Bytes = new TextEncoder().encode(emailContent);
  let binaryString = "";
  for (let i = 0; i < utf8Bytes.length; i++) {
    binaryString += String.fromCharCode(utf8Bytes[i]);
  }

  return btoa(binaryString)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Sends an email using the Gmail REST API with the provided client-side Google OAuth access token.
 */
export async function sendGmailEmail(
  accessToken: string,
  to: string,
  subject: string,
  body: string
): Promise<{ id: string; threadId: string }> {
  const raw = buildRawEmail(to, subject, body);

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });

  if (!response.ok) {
    const errorDetails = await response.json().catch(() => ({ error: { message: "Unknown error" } }));
    throw new Error(errorDetails.error?.message || "Failed to send email via Gmail API");
  }

  return response.json();
}
