import { useState, useEffect, useRef } from 'react';
import { Bot, User, CornerDownLeft, Loader2, Zap, BrainCircuit, Mic, Plus, Settings, Sun, Moon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const App = () => {
    const [chatHistory, setChatHistory] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isIngesting, setIsIngesting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(true);
    const [confluenceCredentials, setConfluenceCredentials] = useState({
        url: '',
        email: '',
        api_token: '',
        space_key: '',
    });
    const [error, setError] = useState(null);
    const [darkMode, setDarkMode] = useState(true);
    const chatEndRef = useRef(null);

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [darkMode]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory, isLoading]);

    const handleCredentialChange = (e) => {
        setConfluenceCredentials({ ...confluenceCredentials, [e.target.name]: e.target.value });
    };

    const handleConnect = async () => {
        setIsIngesting(true);
        setError(null);
        setChatHistory([]);

        try {
            const response = await fetch('http://127.0.0.1:8000/ingest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(confluenceCredentials),
            });

            if (!response.ok) {
                const errorData = await response.json();
                let errorMessage = 'Failed to ingest data.';
                if (errorData && errorData.detail) {
                    errorMessage = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
                }
                throw new Error(errorMessage);
            }
            
            const result = await response.json();
            setChatHistory([{ type: 'bot', text: result.message, sources: [] }]);
            setIsModalOpen(false);

        } catch (err) {
            setError(err.message);
        } finally {
            setIsIngesting(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputValue.trim() || isLoading) return;

        const newHistory = [...chatHistory, { type: 'user', text: inputValue }];
        setChatHistory(newHistory);
        setInputValue('');
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('http://127.0.0.1:8000/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: inputValue }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                let errorMessage = 'Failed to get response.';
                if (errorData && errorData.detail) {
                   errorMessage = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
                }
                throw new Error(errorMessage);
            }

            const result = await response.json();
            setChatHistory([...newHistory, { type: 'bot', text: result.response, sources: result.sources || [] }]);

        } catch (err) {
            setError(err.message);
            // Display the error in the chat history for clarity
            setChatHistory([...newHistory, { type: 'bot', text: `**Error:** ${err.message}`, sources: [] }]);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className={`flex h-screen bg-white dark:bg-slate-900 font-sans ${darkMode ? 'dark' : ''}`}>
             {isModalOpen && (
                 <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
                    <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700">
                        <div className="flex items-center mb-6">
                            <BrainCircuit className="text-indigo-400 mr-3 h-8 w-8" />
                            <h2 className="text-2xl font-bold text-white">Connect to Confluence</h2>
                        </div>
                        <p className="text-slate-400 mb-6">Enter your credentials to start ingesting documentation from a specific space.</p>
                        <form onSubmit={(e) => { e.preventDefault(); handleConnect(); }} className="space-y-4">
                            <input type="text" name="url" placeholder="Confluence URL (e.g., your-domain.atlassian.net)" value={confluenceCredentials.url} onChange={handleCredentialChange} className="w-full p-3 bg-slate-700 rounded-lg text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            <input type="email" name="email" placeholder="Your Atlassian Email" value={confluenceCredentials.email} onChange={handleCredentialChange} className="w-full p-3 bg-slate-700 rounded-lg text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            <input type="password" name="api_token" placeholder="API Token" value={confluenceCredentials.api_token} onChange={handleCredentialChange} className="w-full p-3 bg-slate-700 rounded-lg text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            <input type="text" name="space_key" placeholder="Space Key (e.g., TPD)" value={confluenceCredentials.space_key} onChange={handleCredentialChange} className="w-full p-3 bg-slate-700 rounded-lg text-white placeholder-slate-400 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            {error && <p className="text-red-400 text-sm">{error}</p>}
                            <button type="submit" disabled={isIngesting} className="w-full p-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-500 transition-colors disabled:bg-slate-500 disabled:cursor-not-allowed flex items-center justify-center">
                                {isIngesting ? <Loader2 className="animate-spin mr-2" /> : <Zap className="mr-2" />}
                                {isIngesting ? 'Ingesting...' : 'Connect & Ingest'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            
            {/* Sidebar */}
            <div className="hidden sm:flex w-64 bg-slate-50 dark:bg-slate-950 p-4 border-r border-slate-200 dark:border-slate-800 flex-col">
                <button className="w-full flex items-center justify-center p-2.5 mb-6 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors">
                    <Plus className="mr-2 h-4 w-4" /> New Chat
                </button>
                <div className="flex-grow">
                    <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Recent</h2>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
                    <button onClick={() => setDarkMode(!darkMode)} className="w-full flex items-center p-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg">
                        {darkMode ? <Sun className="mr-3 h-4 w-4" /> : <Moon className="mr-3 h-4 w-4" />}
                        {darkMode ? 'Light Mode' : 'Dark Mode'}
                    </button>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
                <main className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-4xl mx-auto">
                        {chatHistory.map((message, index) => {
                             const isUser = message.type === 'user';
                             return (
                                <div key={index} className={`flex items-start gap-4 mb-8 ${isUser ? 'justify-end' : ''}`}>
                                    {!isUser && (
                                        <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white flex-shrink-0">
                                            <Bot size={24} />
                                        </div>
                                    )}
                                    <div className={`p-4 rounded-2xl max-w-2xl ${isUser
                                            ? 'bg-indigo-600 text-white rounded-br-none'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none'
                                        }`}>
                                        {/* CSS FIX: Conditionally apply prose-invert for user messages */}
                                        <div className={`prose max-w-none ${isUser ? 'prose-invert' : 'prose-slate dark:prose-invert'}`}>
                                            <ReactMarkdown>{message.text}</ReactMarkdown>
                                        </div>
                                        {message.sources && message.sources.length > 0 && (
                                            <div className="mt-4 border-t border-slate-200 dark:border-slate-700 pt-2">
                                                <h4 className="text-xs font-semibold mb-2">Sources:</h4>
                                                <ul className="list-none p-0">
                                                    {message.sources.map((source, i) => (
                                                        <li key={i} className="mb-1">
                                                            <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 text-sm hover:underline truncate block">
                                                               {source.title}
                                                            </a>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                    {isUser && (
                                        <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 flex-shrink-0">
                                            <User size={24} />
                                        </div>
                                    )}
                                </div>
                             );
                        })}
                        {isLoading && (
                            <div className="flex items-start gap-4 mb-8">
                                <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white flex-shrink-0">
                                    <Bot size={24} />
                                </div>
                                <div className="p-4 rounded-2xl max-w-2xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none">
                                    <div className="flex items-center">
                                        <Loader2 className="animate-spin mr-3" />
                                        <span>Thinking...</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>
                </main>

                <footer className="p-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                    <div className="max-w-4xl mx-auto">
                         {error && <p className="text-red-400 text-sm mb-2 text-center">{error}</p>}
                        <form onSubmit={handleSendMessage} className="relative">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Ask a question about the documentation..."
                                className="w-full p-4 pr-24 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                                <button type="button" className="p-2 text-slate-500 hover:text-indigo-500">
                                    <Mic size={20} />
                                </button>
                                <button type="submit" disabled={!inputValue.trim() || isLoading} className="p-2 bg-indigo-600 text-white rounded-lg disabled:bg-slate-500 disabled:cursor-not-allowed ml-2">
                                    <CornerDownLeft size={20} />
                                </button>
                            </div>
                        </form>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default App;

