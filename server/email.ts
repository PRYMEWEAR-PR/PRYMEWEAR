import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { Order, db } from "./db.ts";

export interface EmailLogEntry {
  id: string;
  orderId: string;
  toEmail: string;
  template: "order_placed" | "order_confirmed" | "order_shipped" | "order_delivered" | "order_cancelled";
  subject: string;
  htmlContent: string;
  sentStatus: "sent" | "logged" | "failed";
  error?: string;
  sentAt: string;
}

const OUTBOX_DIR = path.join(process.cwd(), "data");
const OUTBOX_FILE = path.join(OUTBOX_DIR, "email_outbox.json");

function loadOutbox(): EmailLogEntry[] {
  try {
    if (fs.existsSync(OUTBOX_FILE)) {
      return JSON.parse(fs.readFileSync(OUTBOX_FILE, "utf-8"));
    }
  } catch (err) {}
  return [];
}

function saveOutbox(logs: EmailLogEntry[]) {
  try {
    if (!fs.existsSync(OUTBOX_DIR)) {
      fs.mkdirSync(OUTBOX_DIR, { recursive: true });
    }
    fs.writeFileSync(OUTBOX_FILE, JSON.stringify(logs, null, 2), "utf-8");
  } catch (err) {}
}

export const emailOutbox = {
  getAll(): EmailLogEntry[] {
    return loadOutbox();
  },
  add(entry: Omit<EmailLogEntry, "id" | "sentAt">): EmailLogEntry {
    const logs = loadOutbox();
    const newEntry: EmailLogEntry = {
      ...entry,
      id: "eml_" + Math.random().toString(36).substring(2, 10),
      sentAt: new Date().toISOString(),
    };
    logs.unshift(newEntry);
    saveOutbox(logs);
    return newEntry;
  },
};

// Create reusable Nodemailer transporter if credentials provided
function getTransporter() {
  const emailUser = process.env.EMAIL_USER || "thekrtikbusinesss@gmail.com";
  const emailPass = (process.env.EMAIL_PASSWORD || "dmihknihlrbobtsc").replace(/\s+/g, "");
  const service = process.env.EMAIL_SERVICE || "gmail";
  const host = process.env.EMAIL_HOST || "smtp.gmail.com";
  const port = Number(process.env.EMAIL_PORT) || 587;

  if (emailUser && emailPass) {
    return nodemailer.createTransport({
      service: service === "gmail" ? "gmail" : undefined,
      host: service !== "gmail" ? host : undefined,
      port: service !== "gmail" ? port : undefined,
      secure: port === 465,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });
  }
  return null;
}

// Generate luxury PRYMEWEAR responsive HTML email template
export function generateEmailHtml(template: string, order: Order): { subject: string; html: string } {
  const settings = db.getSettings();
  const brandName = settings.storeName || "PRYMEWEAR";
  const supportEmail = settings.supportEmail || "thekrtikbusinesss@gmail.com";
  const supportPhone = settings.supportPhone || "+91 9211597397";

  let title = "Order Update";
  let subject = `${brandName} — Order #${order.id}`;
  let statusBanner = "Order Notification";
  let statusDescription = "Your order details are below.";
  let bannerBg = "#111111";

  switch (template) {
    case "order_placed":
      subject = `${brandName} — Order Received #${order.id}`;
      title = order.paymentMethod === "ONLINE" ? "Online Payment Confirmed" : "Order Received";
      statusBanner = order.paymentMethod === "ONLINE" ? "PAYMENT VERIFIED & ORDER CONFIRMED" : "PENDING ADMIN CONFIRMATION";
      statusDescription = order.paymentMethod === "ONLINE"
        ? "Your online payment has been successfully processed and verified. Our fulfillment team is preparing your package for express dispatch."
        : "We have received your Cash on Delivery (COD) order. Our fulfillment team is reviewing it.";
      bannerBg = order.paymentMethod === "ONLINE" ? "#059669" : "#1f2937";
      break;
    case "order_confirmed":
      subject = `${brandName} — Your Order #${order.id} Has Been Confirmed`;
      title = "Order Confirmed";
      statusBanner = "CONFIRMED & SCHEDULED FOR PACKING";
      statusDescription = "Great news! Your order has been officially confirmed by our team and is moving to dispatch.";
      bannerBg = "#059669";
      break;
    case "order_shipped":
      subject = `${brandName} — Your Order #${order.id} Has Shipped`;
      title = "Order Dispatched";
      statusBanner = "ON ITS WAY VIA EXPRESS COURIER";
      statusDescription = `Your order has been handed over to our courier partner. Estimated delivery: ${order.estimatedDelivery || "2-4 Business Days"}.`;
      bannerBg = "#2563eb";
      break;
    case "order_delivered":
      subject = `${brandName} — Your Order #${order.id} Has Been Delivered`;
      title = "Order Delivered";
      statusBanner = "DELIVERED & SIGNED FOR";
      statusDescription = "Your package has been successfully delivered. We hope you love your new PRYMEWEAR pieces!";
      bannerBg = "#10b981";
      break;
    case "order_cancelled":
      subject = `${brandName} — Order #${order.id} Cancelled`;
      title = "Order Cancelled";
      statusBanner = "ORDER CANCELLED";
      statusDescription = "Your order has been cancelled. If you did not request this, please contact support immediately.";
      bannerBg = "#dc2626";
      break;
  }

  const itemsRows = order.items
    .map(
      item => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 14px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
        <div style="font-weight: 700; font-size: 14px; color: #111111; text-transform: uppercase; letter-spacing: 0.5px;">${item.productName}</div>
        <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">
          Size: <span style="font-weight: 600; color: #111;">${item.size}</span> | 
          Color: <span style="font-weight: 600; color: #111;">${item.color}</span> | 
          SKU: <span style="color: #6b7280;">${item.sku}</span>
        </div>
      </td>
      <td style="padding: 14px 8px; text-align: center; font-size: 14px; font-weight: 600; color: #111111;">
        x${item.quantity}
      </td>
      <td style="padding: 14px 0; text-align: right; font-size: 14px; font-weight: 700; color: #111111;">
        ₹${(item.discountPrice * item.quantity).toLocaleString("en-IN")}
      </td>
    </tr>
  `
    )
    .join("");

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 4px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          
          <!-- Header Branding -->
          <tr>
            <td style="background-color: #000000; padding: 28px 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 900; letter-spacing: 4px; text-transform: uppercase; font-family: 'Helvetica Neue', Arial, sans-serif;">
                ${brandName}
              </h1>
              <p style="margin: 6px 0 0 0; color: #9ca3af; font-size: 11px; letter-spacing: 2px; text-transform: uppercase;">
                ${settings.tagline || "ENGINEERED STREETWEAR & LUXURY"}
              </p>
            </td>
          </tr>

          <!-- Status Banner -->
          <tr>
            <td style="background-color: ${bannerBg}; padding: 12px 32px; text-align: center; color: #ffffff;">
              <span style="font-size: 12px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;">
                ${statusBanner}
              </span>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 800; color: #111827; text-transform: uppercase; letter-spacing: 0.5px;">
                ${title}
              </h2>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #4b5563;">
                Hello <strong style="color: #111;">${order.customerName}</strong>,<br>
                ${statusDescription}
              </p>

              <!-- Order Summary Meta Box -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; padding: 16px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 6px 10px; font-size: 13px; color: #6b7280;">Order ID:</td>
                  <td style="padding: 6px 10px; font-size: 13px; font-weight: 700; color: #111827; text-align: right;">#${order.id}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 10px; font-size: 13px; color: #6b7280;">Payment Mode:</td>
                  <td style="padding: 6px 10px; font-size: 13px; font-weight: 700; color: #059669; text-align: right;">
                    ${order.paymentMethod === "ONLINE" ? "Instant Online Payment (Paid)" : "Cash on Delivery (COD)"}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 10px; font-size: 13px; color: #6b7280;">Order Date:</td>
                  <td style="padding: 6px 10px; font-size: 13px; font-weight: 600; color: #374151; text-align: right;">${new Date(order.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</td>
                </tr>
                ${order.estimatedDelivery ? `
                <tr>
                  <td style="padding: 6px 10px; font-size: 13px; color: #6b7280;">Estimated Delivery:</td>
                  <td style="padding: 6px 10px; font-size: 13px; font-weight: 700; color: #111827; text-align: right;">${order.estimatedDelivery}</td>
                </tr>
                ` : ""}
              </table>

              <!-- Ordered Products Table -->
              <h3 style="margin: 20px 0 10px 0; font-size: 13px; font-weight: 800; color: #374151; text-transform: uppercase; letter-spacing: 1px;">
                Items in Your Order
              </h3>
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                ${itemsRows}
              </table>

              <!-- Pricing Calculation -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 4px 0; font-size: 14px; color: #6b7280;">Subtotal:</td>
                  <td style="padding: 4px 0; font-size: 14px; font-weight: 600; color: #111827; text-align: right;">₹${order.subtotal.toLocaleString("en-IN")}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-size: 14px; color: #6b7280;">Shipping Charges:</td>
                  <td style="padding: 4px 0; font-size: 14px; font-weight: 600; color: ${order.shippingCharges === 0 ? "#059669" : "#111827"}; text-align: right;">
                    ${order.shippingCharges === 0 ? "FREE" : "₹" + order.shippingCharges}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0 4px 0; font-size: 16px; font-weight: 800; color: #111827; border-top: 2px solid #111111;">
                    ${order.paymentMethod === "ONLINE" ? "TOTAL PAID ONLINE:" : "TOTAL DUE (COD):"}
                  </td>
                  <td style="padding: 12px 0 4px 0; font-size: 18px; font-weight: 900; color: #111827; text-align: right; border-top: 2px solid #111111;">₹${order.totalAmount.toLocaleString("en-IN")}</td>
                </tr>
              </table>

              <!-- Shipping Address -->
              <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; padding: 16px; margin-bottom: 24px;">
                <h4 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 800; color: #111827; text-transform: uppercase; letter-spacing: 0.5px;">
                  Delivery Address
                </h4>
                <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #4b5563;">
                  <strong>${order.shippingAddress.fullName}</strong><br>
                  ${order.shippingAddress.addressLine}<br>
                  ${order.shippingAddress.landmark ? order.shippingAddress.landmark + "<br>" : ""}
                  ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}<br>
                  Phone: ${order.shippingAddress.mobile}
                </p>
              </div>

              <!-- Payment Notice -->
              ${order.paymentMethod === "ONLINE" ? `
              <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 4px; padding: 12px 16px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #065f46;">
                  <strong>✓ Online Payment Confirmed:</strong> Your payment of <strong>₹${order.totalAmount.toLocaleString("en-IN")}</strong> has been received in full. No payment is required at the time of delivery.
                </p>
              </div>
              ` : `
              <div style="background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 4px; padding: 12px 16px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #92400e;">
                  <strong>Cash on Delivery (COD) Notice:</strong> Please keep exact cash of <strong>₹${order.totalAmount.toLocaleString("en-IN")}</strong> or have your UPI payment app ready when our delivery executive arrives.
                </p>
              </div>
              `}

              <!-- Support Footer -->
              <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.5; text-align: center;">
                Need help or have questions? Contact PRYME Support at<br>
                <a href="mailto:${supportEmail}" style="color: #000000; font-weight: 700; text-decoration: underline;">${supportEmail}</a> | ${supportPhone}
              </p>

            </td>
          </tr>

          <!-- Footer Legal -->
          <tr>
            <td style="background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 20px 32px; text-align: center;">
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px;">
                © ${new Date().getFullYear()} ${brandName}. All Rights Reserved.
              </p>
              <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                ${settings.storeAddress || "Mumbai, India"}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return { subject, html };
}

// Main Email Send Function
export async function sendOrderEmail(template: "order_placed" | "order_confirmed" | "order_shipped" | "order_delivered" | "order_cancelled", order: Order) {
  const { subject, html } = generateEmailHtml(template, order);
  const customerEmail = order.customerEmail;
  const adminNotifyEmail = process.env.ADMIN_EMAIL_NOTIFY || "thekrtikbusinesss@gmail.com";
  const fromName = db.getSettings().storeName || "PRYMEWEAR";
  const fromEmail = process.env.EMAIL_USER || "thekrtikbusinesss@gmail.com";

  const transporter = getTransporter();

  // Recipients list: includes customer + admin notification email
  const recipientSet = new Set<string>();
  if (customerEmail && customerEmail.includes("@")) {
    recipientSet.add(customerEmail);
  }
  if (adminNotifyEmail && adminNotifyEmail.includes("@")) {
    recipientSet.add(adminNotifyEmail);
  }
  const toRecipients = Array.from(recipientSet).join(", ");

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: toRecipients,
        subject: subject,
        html: html,
      });

      console.log(`[PRYMEWEAR EMAIL] Dispatched email to ${toRecipients} for order #${order.id} [${template}]: ${info.messageId}`);
      
      const entry = emailOutbox.add({
        orderId: order.id,
        toEmail: toRecipients,
        template,
        subject,
        htmlContent: html,
        sentStatus: "sent",
      });
      return { success: true, mode: "smtp", entry };
    } catch (error: any) {
      console.error(`[PRYMEWEAR EMAIL ERROR] Failed to send email via SMTP:`, error);
      const entry = emailOutbox.add({
        orderId: order.id,
        toEmail: toRecipients,
        template,
        subject,
        htmlContent: html,
        sentStatus: "failed",
        error: error.message,
      });
      return { success: false, mode: "failed", entry };
    }
  } else {
    // If SMTP credentials not yet populated in env, store in outbox so admin and test logs can inspect full HTML
    console.log(`[PRYMEWEAR EMAIL OUTBOX] Logged formatted email for ${toRecipients} [${template}] to Outbox.`);
    const entry = emailOutbox.add({
      orderId: order.id,
      toEmail: toRecipients,
      template,
      subject,
      htmlContent: html,
      sentStatus: "logged",
    });
    return { success: true, mode: "logged", entry };
  }
}
