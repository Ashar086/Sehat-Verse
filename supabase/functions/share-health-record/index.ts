import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ShareRecordRequest {
  recordId: string;
  recipientEmail: string;
  recordTitle: string;
  recordType: string;
  recordDate: string;
  documentUrl: string | null;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      recipientEmail,
      recordTitle,
      recordType,
      recordDate,
      documentUrl,
    }: ShareRecordRequest = await req.json();

    console.log("Sharing health record:", {
      recipientEmail,
      recordTitle,
      recordType,
    });

    const emailResponse = await resend.emails.send({
      from: "Health Records <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: `Health Record Shared: ${recordTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                border-radius: 10px 10px 0 0;
                text-align: center;
              }
              .content {
                background: #f9fafb;
                padding: 30px;
                border: 1px solid #e5e7eb;
                border-top: none;
              }
              .record-details {
                background: white;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                border: 1px solid #e5e7eb;
              }
              .detail-row {
                display: flex;
                padding: 10px 0;
                border-bottom: 1px solid #f3f4f6;
              }
              .detail-row:last-child {
                border-bottom: none;
              }
              .detail-label {
                font-weight: 600;
                width: 120px;
                color: #6b7280;
              }
              .detail-value {
                flex: 1;
                color: #111827;
              }
              .button {
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 12px 30px;
                text-decoration: none;
                border-radius: 6px;
                margin: 20px 0;
                font-weight: 600;
              }
              .footer {
                text-align: center;
                color: #6b7280;
                font-size: 14px;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 style="margin: 0;">Health Record Shared</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>A health record has been shared with you. Please find the details below:</p>
              
              <div class="record-details">
                <div class="detail-row">
                  <div class="detail-label">Record Title:</div>
                  <div class="detail-value">${recordTitle}</div>
                </div>
                <div class="detail-row">
                  <div class="detail-label">Type:</div>
                  <div class="detail-value">${recordType}</div>
                </div>
                <div class="detail-row">
                  <div class="detail-label">Date:</div>
                  <div class="detail-value">${recordDate}</div>
                </div>
              </div>

              ${
                documentUrl
                  ? `
                <p>A document has been attached to this record. You can view or download it using the button below:</p>
                <div style="text-align: center;">
                  <a href="${documentUrl}" class="button" target="_blank" rel="noopener noreferrer">
                    View Document
                  </a>
                </div>
              `
                  : `<p><em>No document attached to this record.</em></p>`
              }

              <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
                <p>Keep this information confidential and secure.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in share-health-record function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
