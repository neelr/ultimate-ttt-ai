import { MainBoardState, Player } from "@/components/UltimateTicTacToe";

// API Keys from environment variables
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

// Model constants
const CLAUDE_MODEL = "claude-3-7-sonnet-20250219";
const GPT_MODEL = "o3-mini-2025-01-31";

// How long to pause between moves (in milliseconds)
const MOVE_DELAY = 0;

// Helper function to create a delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type AIResponse = {
  move: { boardIndex: number; cellIndex: number };
  message: string;
};

// Add these interfaces near the top of the file where other interfaces are defined
interface ContentBlock {
  type: string;
  [key: string]: unknown;
}

export async function getClaudeMove(
  boards: MainBoardState,
  mainBoard: (Player | null)[],
  activeBoard: number | null,
  gameRules: string = ""
): Promise<AIResponse> {
  const gameState = {
    boards,
    mainBoard,
    activeBoard,
    player: "X" as Player,
  };

  try {
    // Add delay before making the API call
    await delay(MOVE_DELAY);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 21000,
        thinking: {
          type: "enabled",
          budget_tokens: 19000,
        },
        tools: [
          {
            name: "make_move",
            description:
              "Make a move in the Ultimate Tic-Tac-Toe game. You must provide a strategic message explaining your move and the board and cell indices for your move.",
            input_schema: {
              type: "object",
              properties: {
                message: {
                  type: "string",
                  description:
                    "A short message explaining your strategic thinking for this move",
                },
                boardIndex: {
                  type: "integer",
                  description:
                    "The index of the board (0-8) where you want to make your move",
                },
                cellIndex: {
                  type: "integer",
                  description:
                    "The index of the cell (0-8) within the selected board where you want to make your move",
                },
              },
              required: ["message", "boardIndex", "cellIndex"],
            },
          },
        ],
        messages: [
          {
            role: "user",
            content: `You are playing Ultimate Tic-Tac-Toe. ${
              gameRules ? gameRules : ""
            }

Here's the current game state: ${JSON.stringify(gameState)}. 
          Analyze the board carefully to determine your best move.
          The move must be in an active board (${
            activeBoard === null ? "any board" : `board ${activeBoard}`
          }) and in an empty cell.
          
          After analyzing the game state, please use the make_move tool to submit your move.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Claude response:", data);

    // Check if the response has content blocks
    if (data.content && data.content.length > 0) {
      // Log any thinking blocks for debugging
      const thinkingBlocks = data.content.filter(
        (block: ContentBlock) =>
          block.type === "thinking" || block.type === "redacted_thinking"
      );
      if (thinkingBlocks.length > 0) {
        console.log("Claude's thinking process:", thinkingBlocks);
      }

      // First check if there's a tool_use block
      const toolUseBlock = data.content.find(
        (block: ContentBlock) => block.type === "tool_use"
      );

      if (
        toolUseBlock &&
        toolUseBlock.name === "make_move" &&
        toolUseBlock.input
      ) {
        const toolInput = toolUseBlock.input;

        // Validate the move
        if (
          typeof toolInput.boardIndex === "number" &&
          typeof toolInput.cellIndex === "number" &&
          typeof toolInput.message === "string"
        ) {
          return {
            move: {
              boardIndex: toolInput.boardIndex,
              cellIndex: toolInput.cellIndex,
            },
            message: toolInput.message,
          };
        }
      }

      // If no tool_use block is found, check for a text block
      const textBlock = data.content.find(
        (block: ContentBlock) => block.type === "text"
      );

      if (textBlock && textBlock.text) {
        const text = textBlock.text.trim();
        try {
          // Attempt to extract JSON from the text - handle different formats

          // First check if it contains a code block
          let jsonStr = text;
          const codeBlockRegex = /```(?:json)?\s*([\s\S]+?)\s*```/;
          const codeBlockMatch = text.match(codeBlockRegex);

          if (codeBlockMatch && codeBlockMatch[1]) {
            jsonStr = codeBlockMatch[1].trim();
          }

          // Now try to extract just the JSON object
          const jsonObjectRegex = /(\{[\s\S]*\})/;
          const jsonObjectMatch = jsonStr.match(jsonObjectRegex);

          if (jsonObjectMatch && jsonObjectMatch[1]) {
            jsonStr = jsonObjectMatch[1];
          }

          console.log("Extracted JSON string:", jsonStr);
          const moveData = JSON.parse(jsonStr);

          // Validate the move structure
          if (
            moveData.move &&
            typeof moveData.move.boardIndex === "number" &&
            typeof moveData.move.cellIndex === "number" &&
            typeof moveData.message === "string"
          ) {
            return {
              move: {
                boardIndex: moveData.move.boardIndex,
                cellIndex: moveData.move.cellIndex,
              },
              message: moveData.message,
            };
          }
        } catch (parseError) {
          console.error(
            "Failed to parse Claude's move:",
            parseError,
            "Raw text:",
            text
          );

          // Additional fallback: Try to extract the move data using regex
          try {
            const boardIndexMatch = text.match(
              /["']boardIndex["']\s*:\s*(\d+)/
            );
            const cellIndexMatch = text.match(/["']cellIndex["']\s*:\s*(\d+)/);
            const messageMatch = text.match(
              /["']message["']\s*:\s*["']([^"']+)["']/
            );

            if (boardIndexMatch && cellIndexMatch && messageMatch) {
              return {
                move: {
                  boardIndex: parseInt(boardIndexMatch[1], 10),
                  cellIndex: parseInt(cellIndexMatch[1], 10),
                },
                message: messageMatch[1],
              };
            }
          } catch (regexError) {
            console.error("Regex extraction also failed:", regexError);
          }
        }
      }

      throw new Error("Could not find a valid move in the response");
    } else {
      throw new Error("Unexpected Claude API response structure");
    }
  } catch (error) {
    console.error("Claude API error:", error);
    // Fallback to a random valid move
    return getRandomMove(boards, mainBoard, activeBoard, "Claude");
  }
}

export async function getGPTMove(
  boards: MainBoardState,
  mainBoard: (Player | null)[],
  activeBoard: number | null,
  gameRules: string = ""
): Promise<AIResponse> {
  const gameState = {
    boards,
    mainBoard,
    activeBoard,
    player: "O" as Player,
  };

  try {
    // Add delay before making the API call
    await delay(MOVE_DELAY);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: GPT_MODEL,
        messages: [
          {
            role: "user",
            content: `You are playing Ultimate Tic-Tac-Toe. ${
              gameRules ? gameRules : ""
            }

Here's the current game state: ${JSON.stringify(gameState)}. 
          First, analyze the board and explain your strategic thinking.
          Then, make your move.
          Return only a plain JSON object (no markdown, no backticks) with: 
          1. A "message" field explaining your thought process (keep it short)
          2. A "move" field with {boardIndex, cellIndex} 
          The move must be in an active board (${
            activeBoard === null ? "any board" : `board ${activeBoard}`
          }) and in an empty cell. DO NOT format your response with markdown or code blocks. KEEP YOUR RESPONSE CONCISE.`,
          },
        ],
        max_completion_tokens: 25000, // Increased to allow for both reasoning and completion tokens
        reasoning_effort: "high", // Add reasoning effort parameter for o3-mini
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.choices && data.choices[0] && data.choices[0].message.content) {
      let contentText = data.choices[0].message.content.trim();
      console.log("Raw GPT response:", contentText);

      // Try to extract JSON if wrapped in markdown code blocks
      if (contentText.startsWith("```")) {
        // Extract content between markdown code block delimiters
        const matches = contentText.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
        if (matches && matches[1]) {
          contentText = matches[1].trim();
        } else {
          contentText = contentText.replace(/```(?:json)?|```/g, "").trim();
        }
      }

      // Attempt to sanitize the JSON
      // First try to find and fix common JSON formatting issues
      contentText = contentText
        // Replace escaped quotes that might confuse the parser
        .replace(/\\"/g, '"')
        // Make sure quotes around property names are double quotes
        .replace(/(\w+)(?:\s*:\s*)/g, '"$1":')
        // Fix any single quotes used instead of double quotes for strings
        .replace(/:\s*'([^']*?)'/g, ':"$1"')
        // Replace any unescaped newlines in strings
        .replace(/([":,])\s*\n\s*([":{\[\w])/g, "$1$2");

      // Try to extract valid JSON if it exists within the response
      const jsonMatch = contentText.match(/(\{[\s\S]*\})/);
      if (jsonMatch) {
        contentText = jsonMatch[0];
      }

      console.log("Processed GPT response for parsing:", contentText);

      try {
        // Extract only the JSON object to avoid any trailing invisible characters
        const strictJsonMatch = contentText.match(/^\s*(\{.*\})\s*$/);
        let cleanJson = contentText;

        if (strictJsonMatch && strictJsonMatch[1]) {
          cleanJson = strictJsonMatch[1];
        }

        const aiResponse = JSON.parse(cleanJson);

        // Normalize field names - support both message and strategic_message
        const message =
          aiResponse.message ||
          aiResponse["strategic message"] ||
          aiResponse.strategic_message ||
          "Strategic move based on current board state";

        // Validate the move field exists
        if (
          !aiResponse.move ||
          typeof aiResponse.move.boardIndex !== "number" ||
          typeof aiResponse.move.cellIndex !== "number"
        ) {
          throw new Error(
            "Invalid response structure: missing required move fields"
          );
        }

        return {
          move: {
            boardIndex: aiResponse.move.boardIndex,
            cellIndex: aiResponse.move.cellIndex,
          },
          message: message,
        };
      } catch (parseError) {
        console.error(
          "Failed to parse GPT response as JSON:",
          parseError,
          "Content:",
          contentText
        );
        console.error("Raw response content:", data.choices[0].message.content);

        // Try an alternative approach - manually extract the values
        try {
          console.log("Attempting manual extraction from JSON...");

          // Match the move object with regex
          const moveMatch = contentText.match(
            /"move"\s*:\s*{\s*"boardIndex"\s*:\s*(\d+)\s*,\s*"cellIndex"\s*:\s*(\d+)\s*}/
          );

          if (moveMatch && moveMatch[1] && moveMatch[2]) {
            const boardIndex = parseInt(moveMatch[1], 10);
            const cellIndex = parseInt(moveMatch[2], 10);

            // Extract any message content (taking everything between "message": " and the next ")
            const messageMatch = contentText.match(/"message"\s*:\s*"([^"]+)"/);
            const message =
              messageMatch && messageMatch[1]
                ? messageMatch[1]
                : "Strategic move based on current board state";

            console.log(
              `Manual extraction successful: Board ${boardIndex}, Cell ${cellIndex}`
            );

            return {
              move: {
                boardIndex,
                cellIndex,
              },
              message,
            };
          }

          // If we couldn't extract the move, rethrow the original error
          throw parseError;
        } catch (fallbackError) {
          console.error("Manual extraction also failed:", fallbackError);
          throw parseError; // Throw the original JSON parse error
        }
      }
    } else {
      throw new Error("Unexpected GPT API response structure");
    }
  } catch (error) {
    console.error("GPT API error:", error);
    // Fallback to a random valid move
    return getRandomMove(boards, mainBoard, activeBoard, "GPT");
  }
}

function getRandomMove(
  boards: MainBoardState,
  mainBoard: (Player | null)[],
  activeBoard: number | null,
  aiName: string
): AIResponse {
  const validBoards =
    activeBoard === null
      ? mainBoard.map((_, i) => i).filter((i) => !mainBoard[i])
      : [activeBoard];

  for (const boardIndex of validBoards) {
    const emptyCells = boards[boardIndex]
      .map((cell, i) => ({ cell, index: i }))
      .filter(({ cell }) => cell === null)
      .map(({ index }) => index);

    if (emptyCells.length > 0) {
      const cellIndex =
        emptyCells[Math.floor(Math.random() * emptyCells.length)];
      return {
        message: `${aiName} thinking: Making a random move since no strategic options are available.`,
        move: { boardIndex, cellIndex },
      };
    }
  }

  throw new Error("No valid moves available");
}
