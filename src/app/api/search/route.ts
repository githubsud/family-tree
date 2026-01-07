
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { adminDb } from '@/lib/firebaseAdmin';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
  try {
    const { query, treeId } = await request.json();

    if (!query || !treeId) {
      return NextResponse.json({ error: 'Missing query or treeId' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API Key not configured' }, { status: 500 });
    }

    // 1. Fetch all tree members
    const membersSnapshot = await adminDb
      .collection('members')
      .where('treeId', '==', treeId)
      .get();

    const members = membersSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        gender: data.gender,
        parentId: data.parentId
      };
    });

    // 2. Construct Prompt
    const membersJson = JSON.stringify(members, null, 2);
    const systemInstruction = `
      You are an intelligent assistant for a Family Tree application.
      You have access to the following family tree data in JSON format:
      ${membersJson}

      The JSON structure represents nodes. 'parentId' points to the father/mother.
      
      Your task is to answer the user's question based ONLY on this data.
      If the answer is not in the data, say "I don't know" or "Data not available".
      
      Common questions:
      - "Who are the sons of X?" -> Find members where parentId is X's ID.
      - "Who is the father of Y?" -> Find the member with ID equal to Y's parentId.
      - "List all females" -> Filter by gender 'female'.
      
      Output the answer in Arabic clearly and concisely.
    `;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: {
        role: "system",
        parts: [{ text: systemInstruction }]
      }
    });

    const result = await model.generateContent(query);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ answer: text });

  } catch (error: any) {
    console.error('Search Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
