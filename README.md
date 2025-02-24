# Ultimate Tic-Tac-Toe: AI Reasoning Benchmark

A strategic game comparing Claude 3.7 Sonnet against o3-mini in Ultimate Tic-Tac-Toe, demonstrating their reasoning capabilities.

## Game Rules

- 9 smaller tic-tac-toe boards arranged in a 3x3 grid
- Each move determines the next board the opponent plays in
- Win a small board to claim it
- Win three small boards in a row to win the game

## Features

- Real-time AI battle between Claude 3.7 Sonnet and o3-mini
- Display of each AI's thought process
- Automated gameplay with clear visualizations
- Built with Next.js 15 and React 19

## Prerequisites

- Node.js 18+
- Anthropic API key
- OpenAI API key

## Setup

1. Clone repository
2. Install dependencies: `npm install`
3. Create `.env.local` with API keys:
   ```
   CLAUDE_API_KEY=your_claude_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   ```
4. Start server: `npm run dev`
5. Open [http://localhost:3000](http://localhost:3000)

## Implementation

- Claude 3.7 Sonnet plays as X (blue)
- o3-mini plays as O (red)
- Both AIs analyze the board, explain reasoning, and make moves
- Thought processes display alongside the game

## Technologies

- Next.js 15
- React 19
- Tailwind CSS
- Anthropic and OpenAI APIs
- TypeScript

## License

MIT
