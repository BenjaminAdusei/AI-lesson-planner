const { Groq } = require('groq-sdk');

// Initialize Groq client – API key will be loaded from Netlify environment variables
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

exports.handler = async (event) => {
  // 1.  ONLY accept POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    // 2.  Parse incoming request body
    const { topic, classLevel, duration, subject, resources } = JSON.parse(event.body);

    if (!topic) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Topic is required' }),
      };
    }

    // 3.  Construct a professional prompt for the WAEC-aligned lesson plan
    const prompt = `You are an expert AI teaching assistant specialized in Ghana’s WAEC curriculum for Basic Schools (JHS) and Senior High School.

Create a detailed, structured lesson plan based on the following parameters:
- Topic: "${topic}"
- Subject: "${subject || 'General Studies'}"
- Class / Level: "${classLevel}"
- Duration: "${duration}"
- Available Resources / Materials: "${resources || 'Basic classroom supplies (chalkboard, chalk, notebooks)'}"

Format the lesson plan using the official WAEC Ghana lesson structure:

Lesson Title: ${topic}
Class: ${classLevel} | Subject: ${subject} | Duration: ${duration}

🎯 Learning Objectives (2-3 clear, measurable objectives):

🧾 **Previous Knowledge** (what students are expected to know already):

🛠️ **Teaching / Learning Materials** (low-cost, locally available resources from the input):

**Introduction (5-7 minutes):** – Engage students, relate to familiar experiences.

**Lesson Development (Main Activity):**
   Step 1:
   Step 2:
   Step 3:
   (Include interactive questions, group tasks, or demonstrations – focus on participatory method)

**Assessment / Evaluation (5 minutes):** – Quick oral questions or written task to check understanding.

**Conclusion (2-3 minutes):** – Summarize key takeaway and link to next lesson.

**Homework / Follow-up Activity:** – Task that reinforces lesson without extra resources.

Adapt the language to be classroom-friendly for Ghanaian teachers. Use local examples where possible (cocoa farming, market, etc.). Keep tone encouraging and practical.

---

Lesson Plan:`;

    // 4.  Call Groq API (choose model Llama 3 70B which is excellent for structured instruction)
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a helpful teaching assistant specialized in Ghana’s WAEC curriculum.' },
        { role: 'user', content: prompt },
      ],
      model: 'llama-3.3-70b-versatile',  //  free-tier available,  amazing for reasoning
      temperature: 0.5,          //  keep creativity balanced but not too loose
      max_tokens: 1500,
    });

    const lessonPlan = completion.choices[0].message.content;

    // 5.  Return generated plan to frontend
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify({ lessonPlan }),
    };
  } catch (error) {
    console.error('Groq API error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error. Please verify your API key and try again.' }),
    };
  }
};
