export async function sendWhatsAppMessage(
  toPhone: string, 
  message: string,
  contentSid?: string,
  contentVariables?: Record<string, string>
) {
  console.log(`[MOCK WHATSAPP] To: ${toPhone}, Message: ${message}`);
  return { success: true, sid: "mock_sid_" + Date.now() };
}

export async function sendSmsMessage(toPhone: string, message: string) {
  console.log(`[MOCK SMS] To: ${toPhone}, Message: ${message}`);
  return { success: true, sid: "mock_sid_" + Date.now() };
}

export function formatMessageTemplate(
  template: string,
  variables: { code?: string; link?: string; userName?: string; productName?: string }
): string {
  let msg = template.replace(/\\n/g, '\n');
  if (variables.code) msg = msg.replace(/{{code}}/g, variables.code);
  if (variables.link) msg = msg.replace(/{{link}}/g, variables.link);
  if (variables.userName) msg = msg.replace(/{{userName}}/g, variables.userName);
  if (variables.productName) msg = msg.replace(/{{productName}}/g, variables.productName);
  return msg;
}
