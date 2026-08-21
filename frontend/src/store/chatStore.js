import { create } from "zustand";
import useUserStore from "./userStore";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000";

const useChatStore = create((set, get) => ({
  // ============================================================
  // SARA / AI COMPANION
  // ============================================================

  companionMessages: [],
  companionLoading: false,
  lastSentiment: null,
  companionError: null,

  fetchCompanionHistory: async () => {
    const userId = useUserStore.getState().ensureUserId();
    const token = useUserStore.getState().token;
    
    set({ companionLoading: true, companionError: null });
    
    try {
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      
      const response = await fetch(`${API_BASE_URL}/api/chat/history?user_id=${userId}`, {
        method: "GET",
        headers,
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load chat history: ${response.status}`);
      }
      
      const data = await response.json();
      
      set({
        companionMessages: data.messages || [],
        companionLoading: false,
      });
    } catch (error) {
      console.error("Failed to fetch chat history:", error);
      set({
        companionLoading: false,
        companionError: error.message,
      });
    }
  },

  fetchActiveRoleplay: async () => {
    const userId = useUserStore.getState().ensureUserId();
    const token = useUserStore.getState().token;
    
    set({ roleplayLoading: true, roleplayError: null });
    
    try {
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      
      const response = await fetch(`${API_BASE_URL}/api/roleplay/history?user_id=${userId}`, {
        method: "GET",
        headers,
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load active roleplay: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.scenario) {
        set({
          roleplayScenario: data.scenario,
          roleplayMessages: data.messages || [],
          roleplayLoading: false,
        });
        return true;
      } else {
        set({
          roleplayLoading: false,
        });
        return false;
      }
    } catch (error) {
      console.error("Failed to fetch active roleplay:", error);
      set({
        roleplayLoading: false,
        roleplayError: error.message,
      });
      return false;
    }
  },

  // ============================================================
  // ROLEPLAY / PRACTICE ROOM
  // ============================================================

  roleplayMessages: [],
  roleplayLoading: false,
  roleplayScenario: null,
  roleplayError: null,
  roleplayFeedback: null,
  roleplayShouldEnd: false,
  roleplayEnding: false,
  roleplayCommunicationStats: null,
  roleplaySentiment: null,

  // ============================================================
  // SEND MESSAGE TO SARA
  // ============================================================

  sendCompanionMessage: async (message, options = {}) => {
    const text = typeof message === "string" ? message.trim() : "";

    if (!text) return null;

    const { isVoiceMode = false } = options;

    const currentMessages = get().companionMessages || [];

    const userMessage = {
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
      isVoiceMode,
    };

    const updatedMessages = [...currentMessages, userMessage];

    set({
      companionMessages: updatedMessages,
      companionLoading: true,
      companionError: null,
    });

    try {
      const token = useUserStore.getState().token;
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: updatedMessages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          is_voice_mode: isVoiceMode,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Chat request failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();

      const saraResponse =
        data.reply ||
        data.response ||
        data.message ||
        "I'm here with you. Tell me a little more.";

      const saraMessage = {
        role: "assistant",
        content: saraResponse,
        timestamp: new Date().toISOString(),
      };

      set((state) => ({
        companionMessages: [...state.companionMessages, saraMessage],
        companionLoading: false,
        lastSentiment: data.sentiment || state.lastSentiment,
      }));

      return data;
    } catch (error) {
      console.error("Sara conversation error:", error);

      set({
        companionLoading: false,
        companionError: error.message,
      });

      return null;
    }
  },

  // ============================================================
  // STANDALONE SENTIMENT ANALYSIS
  // ============================================================

  analyzeSentiment: async (text, source = "chat") => {
    if (!text?.trim()) return null;

    try {
      const response = await fetch(`${API_BASE_URL}/api/sentiment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          source,
        }),
      });

      if (!response.ok) {
        throw new Error(`Sentiment request failed: ${response.status}`);
      }

      const data = await response.json();

      set({ lastSentiment: data });

      // Also track sentiment specifically for roleplay sessions
      if (source === "roleplay") {
        set({ roleplaySentiment: data });
      }

      return data;
    } catch (error) {
      console.error("SaraSense error:", error);
      return null;
    }
  },

  // ============================================================
  // START ROLEPLAY
  // ============================================================

  startRoleplay: async (scenarioId) => {
    set({
      roleplayMessages: [],
      roleplayLoading: true,
      roleplayScenario: scenarioId,
      roleplayError: null,
      roleplayFeedback: null,
      roleplayShouldEnd: false,
      roleplayEnding: false,
      roleplayCommunicationStats: null,
      roleplaySentiment: null,
    });

  try {
    const token = useUserStore.getState().token;
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(
      `${API_BASE_URL}/api/roleplay/start`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          scenario: scenarioId,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Roleplay start failed: ${response.status}`
      );
    }

    const data = await response.json();

    const opener = {
      role: "assistant",
      content: data.reply || "Hi! Let's begin our practice.",
      timestamp: new Date().toISOString(),
    };

    set({
      roleplayMessages: [opener],
      roleplayLoading: false,
    });

    return data;
  } catch (error) {
    console.error("Roleplay start error:", error);

    set({
      roleplayLoading: false,
      roleplayError: error.message,
    });

    return null;
  }
},

  // ============================================================
  // SEND ROLEPLAY MESSAGE
  // ============================================================

  sendRoleplayMessage: async (message) => {
    const text = typeof message === "string" ? message.trim() : "";

    if (!text) return null;

    const { roleplayMessages, roleplayScenario } = get();

    const currentMessages = Array.isArray(roleplayMessages)
      ? roleplayMessages
      : [];

    const userMessage = {
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...currentMessages, userMessage];

    set({
      roleplayMessages: updatedMessages,
      roleplayLoading: true,
      roleplayError: null,
    });

    try {
      const token = useUserStore.getState().token;
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(`${API_BASE_URL}/api/roleplay/message`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          scenario: roleplayScenario,
          messages: updatedMessages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Roleplay request failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();

      const saraResponse =
        data.reply ||
        data.response ||
        data.message ||
        "Let's continue the practice.";

      const saraMessage = {
        role: "assistant",
        content: saraResponse,
        timestamp: new Date().toISOString(),
      };

      set((state) => ({
        roleplayMessages: [...state.roleplayMessages, saraMessage],
        roleplayLoading: false,
      }));

      // Analyze sentiment of the user's turn in the background
      get().analyzeSentiment(text, "roleplay");

      return data;
    } catch (error) {
      console.error("Roleplay conversation error:", error);

      set({
        roleplayLoading: false,
        roleplayError: error.message,
      });

      return null;
    }
  },

  // ============================================================
  // END ROLEPLAY + GENERATE FEEDBACK & SPEECH/COMMUNICATION ANALYSIS
  // ============================================================

  endRoleplay: async () => {
    const { roleplayMessages, roleplayScenario } = get();

    set({
      roleplayShouldEnd: true,
      roleplayEnding: true,
      roleplayError: null,
    });

    try {
      const token = useUserStore.getState().token;
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(`${API_BASE_URL}/api/roleplay/analyze`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          scenario: roleplayScenario,
          messages: roleplayMessages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Roleplay analysis request failed: ${response.status} ${errorText}`
        );
      }

      const data = await response.json();

      set({
        roleplayFeedback: data.feedback || null,
        roleplayCommunicationStats: {
          words: data.total_words,
          fillerWords: data.filler_words,
          fillerWordRate: data.filler_word_rate,
          turns: data.total_turns,
          averageWordsPerTurn: data.average_words_per_turn,
          speakingPace: data.speaking_pace,
          paceDots: data.pace_dots,
          pauses: data.pauses,
          pauseDots: data.pause_dots,
          clarityScore: data.clarity_score,
          confidenceScore: data.confidence_score,
          communicationScore: data.communication_score,
          saraQuote: data.sara_quote,
        },
        roleplayEnding: false,
      });

      return data;
    } catch (error) {
      console.error("Roleplay end/analysis error:", error);

      set({
        roleplayEnding: false,
        roleplayError: error.message,
      });

      return null;
    }
  },

  // ============================================================
  // CLEAR ROLEPLAY STATE
  // ============================================================

  clearRoleplay: () => {
    set({
      roleplayMessages: [],
      roleplayLoading: false,
      roleplayScenario: null,
      roleplayError: null,
      roleplayFeedback: null,
      roleplayShouldEnd: false,
      roleplayEnding: false,
      roleplayCommunicationStats: null,
      roleplaySentiment: null,
    });
  },

  // ============================================================
  // CLEAR SARA CONVERSATION
  // ============================================================

  clearCompanionMessages: () => {
    set({
      companionMessages: [],
      lastSentiment: null,
      companionError: null,
    });
  },

  // ============================================================
  // CLEAR ERROR
  // ============================================================

  clearCompanionError: () => {
    set({ companionError: null });
  },
}));

export default useChatStore;
export { useChatStore };