
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
        parentId: data.parentId,
        spouseOf: data.spouseOf,
        isSpouse: data.isSpouse,
        order: data.order,
        isDeceased: data.isDeceased,
        location: data.location,
        occupation: data.occupation,
        hobbies: data.hobbies,
        bio: data.bio
      };
    });

    // 2. Construct Prompt
    const membersJson = JSON.stringify(members, null, 2);
    const systemInstruction = `
      You are an intelligent assistant for a Family Tree application.
      You have access to the following family tree data in JSON format:
      ${membersJson}

      The JSON structure represents nodes. 'parentId' points to the father/mother.
      'spouseOf' points to the partner they are married to. 'isSpouse' means this node represents a spouse.
      
      Note: A person might exist twice in the tree: once as a child (Member) and once as a wife (Spouse).
      If the user asks about relationships involving such a person, check both records. 
      If a Spouse node has the same name as a Member node, you may infer they could be the same person, but rely on the explicit 'spouseOf' link for marriage info.

      Your task is to answer the user's question based ONLY on this data.
      If the answer is not in the data, say "I don't know" or "Data not available".
      
      Common questions:
      - "Who are the sons of X?" -> Find members where parentId is X's ID.
      - "Who is the wife of X?" -> Find members where spouseOf is X's ID.
      - "Who lives in Sudan?" -> Check 'location.country'.
      - "Who is an Engineer?" -> Check 'occupation.title'.
      - "List all deceased members" -> Check 'isDeceased' is true.
      
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
