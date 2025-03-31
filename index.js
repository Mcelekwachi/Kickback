const express = require('express')
const dotenv = require('dotenv')
const path = require('path')

// ✅ Use new OpenAI SDK import
const OpenAI = require('openai')

dotenv.config()

const app = express()
const port = 3000

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static('public')) // Serves public/index.html

// ✅ Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// ✅ AI Product Generator Endpoint
app.post('/generate', async (req, res) => {
  const { handle } = req.body

  // Fake content for now (we'll replace this with real scanning later)
  const fakeContent = `
    "Just hit a new PR at the gym!"
    "Here's my full ab workout – 10 mins no equipment."
    "Meal prep Sunday – high protein recipes!"
  `

  const prompt = `
    Based on the following creator content:
    ${fakeContent}

    Suggest 3 digital micro-products they could sell.
    Format as JSON:
    [
      { "title": "...", "description": "..." },
      ...
    ]
  `

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    })

    const ideas = completion.choices[0]?.message?.content || '[]'

    res.send(ideas)
  } catch (error) {
    console.error('🛑 OpenAI Error:', error.message)

    res.status(500).json({
      error: 'AI generation failed. Please try again later.',
      details: error.message,
    })
  }
})

// ✅ Start Server
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`)
})
