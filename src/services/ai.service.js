const { GoogleGenAI }  = require("@google/genai");
const z = require("zod");
const zodToJsonSchema = require("zod-to-json-schema");

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY,
})

// async function invokeGeminiAi(){
//     const response = await ai.models.generateContent({
//         model: "gemini-2.5-flash",
//         contents: "Hello Gemini! Explain the term Interview?",
//     })

//     console.log(response.text);
// }

const interviewReportSchema = z.object({
    matchScore: z.number().min(0).max(100).describe("A score from 0 to 100 indicating how well the candidate's profile matches the job description. 0 means no match, 100 means perfect match."),
    technicalQuestions: z.array(z.object({
        question: z.string().describe("The technical question that can be asked in the interview"),
        intention: z.string().describe("The intention of the interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc")
    })).describe("Technical questions that can be asked in the interview along with their intention and how to answer them."),
    behavioralQuestions: z.array(z.object({
        question: z.string().describe("The behavioral question that can be asked in the interview"),
        intention: z.string().describe("The intention of the interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc")
    })).describe("Behavioral questions that can be asked in the interview along with their intention and how to answer them."),
    skillGaps: z.array(z.object({
        skill: z.string().describe("The skill which the candidate is lacking"),
        severity: z.enum(["low", "medium", "high"]).describe("The severity of the skill gap — low means minor improvement needed, medium means noticeable gap that could affect performance, high means critical gap that must be addressed before the interview")
    })).describe("Skills the candidate is lacking based on the job description, along with how critical each gap is."),
    preparationPlan: z.array(z.object({
        day: z.number().describe("The day number of the preparation plan, e.g. Day 1, Day 2 etc"),
        focus: z.string().describe("The main topic or area to focus on for that day"),
        tasks: z.array(z.string()).describe("List of specific tasks to complete on that day to improve readiness for the interview")
    })).describe("A day-by-day preparation plan to help the candidate bridge skill gaps and prepare effectively for the interview.")
})

async function generateInterviewReport({resume, selfDescription, jobDescription}){

    const prompt = `You are an expert career coach and technical interviewer.
                    Analyze the following candidate information and job description, then generate a structured interview preparation report.
                    Candidate Resume:
                    ${resume}
                    Candidate Self Description:
                    ${selfDescription}
                    Job Description:
                    ${jobDescription}
                    Based on the above, generate:
                    - A match score (0-100) of how well the candidate fits the role
                    - 5 technical questions likely to be asked with intention and how to answer
                    - 3 behavioral questions with intention and how to answer
                    - Key skill gaps with severity
                    - A 7-day preparation plan with daily focus and tasks
                    `

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(interviewReportSchema)
        }
    })

    return JSON.parse(response.text);
}

module.exports = { generateInterviewReport };