const { GoogleGenAI } = require("@google/genai");
const { z } = require("zod");
const { zodToJsonSchema } = require("zod-to-json-schema");
const puppeteer = require("puppeteer");

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENAI_API_KEY,
});

// async function invokeGeminiAi(){
//     const response = await ai.models.generateContent({
//         model: "gemini-2.5-flash",
//         contents: "Hello Gemini! Explain the term Interview?",
//     })

//     console.log(response.text);
// }

const interviewReportSchema = z.object({
  matchScore: z
    .number()
    .min(0)
    .max(100)
    .describe(
      "A score from 0 to 100 indicating how well the candidate's profile matches the job description. 0 means no match, 100 means perfect match.",
    ),
  technicalQuestions: z
    .array(
      z.object({
        question: z
          .string()
          .describe(
            "The technical question that can be asked in the interview",
          ),
        intention: z
          .string()
          .describe(
            "The intention of the interviewer behind asking this question",
          ),
        answer: z
          .string()
          .describe(
            "How to answer this question, what points to cover, what approach to take etc",
          ),
      }),
    )
    .describe(
      "Technical questions that can be asked in the interview along with their intention and how to answer them.",
    ),
  behavioralQuestions: z
    .array(
      z.object({
        question: z
          .string()
          .describe(
            "The behavioral question that can be asked in the interview",
          ),
        intention: z
          .string()
          .describe(
            "The intention of the interviewer behind asking this question",
          ),
        answer: z
          .string()
          .describe(
            "How to answer this question, what points to cover, what approach to take etc",
          ),
      }),
    )
    .describe(
      "Behavioral questions that can be asked in the interview along with their intention and how to answer them.",
    ),
  skillGaps: z
    .array(
      z.object({
        skill: z.string().describe("The skill which the candidate is lacking"),
        severity: z
          .enum(["low", "medium", "high"])
          .describe(
            "The severity of the skill gap — low means minor improvement needed, medium means noticeable gap that could affect performance, high means critical gap that must be addressed before the interview",
          ),
      }),
    )
    .describe(
      "Skills the candidate is lacking based on the job description, along with how critical each gap is.",
    ),
  preparationPlan: z
    .array(
      z.object({
        day: z
          .number()
          .describe(
            "The day number of the preparation plan, e.g. Day 1, Day 2 etc",
          ),
        focus: z
          .string()
          .describe("The main topic or area to focus on for that day"),
        tasks: z
          .array(z.string())
          .describe(
            "List of specific tasks to complete on that day to improve readiness for the interview",
          ),
      }),
    )
    .describe(
      "A day-by-day preparation plan to help the candidate bridge skill gaps and prepare effectively for the interview.",
    ),
  title: z
    .string()
    .describe(
      "The title of the job for which the interview report is generated.",
    ),
});

async function generateInterviewReport({
  resume,
  selfDescription,
  jobDescription,
}) {
 const prompt = `You are an expert career coach and technical interviewer.
                    Analyze the following candidate information and job description, then generate a structured interview preparation report.
                    Candidate Resume:
                    ${resume}
                    Candidate Self Description:
                    ${selfDescription}
                    Job Description:
                    ${jobDescription}
                    Return a JSON object with EXACTLY this structure — use nested objects, NOT flat arrays:
                    {
                    "title": "job title extracted from job description",
                    "matchScore": 0-100,
                    "technicalQuestions": [
                        {
                        "question": "the question",
                        "intention": "why interviewer asks this",
                        "answer": "how to answer this"
                        }
                    ],
                    "behavioralQuestions": [
                        {
                        "question": "the question",
                        "intention": "why interviewer asks this",
                        "answer": "how to answer this"
                        }
                    ],
                    "skillGaps": [
                        {
                        "skill": "skill name",
                        "severity": "low or medium or high"
                        }
                    ],
                    "preparationPlan": [
                        {
                        "day": 1,
                        "focus": "topic to focus on",
                        "tasks": ["task 1", "task 2"]
                        }
                    ]
                    }

                    IMPORTANT:
                    - Generate exactly 10 technicalQuestions
                    - Generate exactly 10 behavioralQuestions  
                    - Generate exactly 7 preparationPlan days
                    - severity must be exactly "low", "medium", or "high"
                    - Use camelCase field names exactly as shown above
                    - Do NOT return flat arrays — each item must be a proper object with named fields
                    `;
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    //   responseSchema: zodToJsonSchema(interviewReportSchema),
    },
  });

  const parsed = JSON.parse(response.text);
  console.log("AI Response:", parsed);
  return parsed;
}

async function generatePdfFromHtml(htmlContent) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: "networkidle0" });

  const pdfBuffer = await page.pdf({
    format: "A4",
    margin: {
      top: "20mm",
      bottom: "20mm",
      left: "15mm",
      right: "15mm",
    },
  });

  await browser.close();

  return pdfBuffer;
}

async function generateResumePdf({ resume, selfDescription, jobDescription }) {
  const resumePdfSchema = z.object({
    html: z
      .string()
      .describe(
        "The HTML content of the resume which can be converted to PDF using any library like puppeteer",
      ),
  });

  const prompt = `Generate resume for a candidate with the following details:
                        Resume: ${resume}
                        Self Description: ${selfDescription}
                        Job Description: ${jobDescription}

                        the response should be a JSON object with a single field "html" which contains the HTML content of the resume which can be converted to PDF using any library like puppeteer.
                        The resume should be tailored for the given job description and should highlight the candidate's strengths and relevant experience. The HTML content should be well-formatted and structured, making it easy to read and visually appealing.
                        The content of resume should be not sound like it's generated by AI and should be as close as possible to a real human-written resume.
                        you can highlight the content using some colors or different font styles but the overall design should be simple and professional.
                        The content should be ATS friendly, i.e. it should be easily parsable by ATS systems without losing important information.
                        The resume should not be so lengthy, it should ideally be 1-2 pages long when converted to PDF. Focus on quality rather than quantity and make sure to include all the relevant information that can increase the candidate's chances of getting an interview call for the given job description.
                    `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: zodToJsonSchema(resumePdfSchema),
    },
  });

  const jsonContent = JSON.parse(response.text);

  const pdfBuffer = await generatePdfFromHtml(jsonContent.html);

  return pdfBuffer;
}

module.exports = { generateInterviewReport, generateResumePdf };
