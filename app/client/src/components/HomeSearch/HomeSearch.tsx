import {
    Atom,
    Search,
    ArrowUp,
    Component,
    Code2,
    ArrowDown,
    Code,
    ArrowUpRightSquare,
    X,
    Timer,
    CalendarDays,
    Copy,
    Download
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTrigger,
} from "@/components/ui/drawer"
import { useEffect, useState, useRef } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { SchemaType } from "@google/generative-ai";
import { LinkPreviewFetcher } from "./link-preview-fetcher";
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable"
import SyntaxHighlighter from 'react-syntax-highlighter';
import { tomorrowNight } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { toast } from "sonner";
import { motion } from "framer-motion";
import BlurFade from "@/components/ui/blur-fade";
import { HomeMarquee } from "./HomeMarquee";

interface Results {
    text: string;
    resources: string[];
    files: {
        name: string;
        content: string;
    }[];
}

interface Chats {
    query: string;
    response: Results;
    responseTime: number;
    timestamp: Date;
}

const HomeSearch = () => {

    const [searchQuery, setSearchQuery] = useState("");
    const [chatHistory, setChatHistory] = useState<Chats[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [inputDisabled, setInputDisabled] = useState(false);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const [splitView, setSplitView] = useState(false);
    interface File {
        name: string;
        content: string;
    }

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [openedFiles, setOpenedFiles] = useState<Set<File>>(new Set());

    const handleFileSelect = (file: File) => {
        setOpenedFiles((prevFiles) => {
            const newFiles = new Set(prevFiles);
            const existingFile = Array.from(newFiles).find(f => f.name === file.name);
            if (existingFile) {
                newFiles.delete(existingFile);
            }
            newFiles.add(file);
            return newFiles;
        });
        setSelectedFile(file);
    };

    const handleFileClose = (file: File) => {
        setOpenedFiles((prevFiles) => {
            const newFiles = new Set(prevFiles);
            newFiles.delete(file);
            return newFiles;
        });
        if (selectedFile === file) {
            setSelectedFile(null);
        }
    };

    const copyChatToClipboard = (chat: Chats) => {
        const chatText = JSON.stringify(chat, null, 2);
        navigator.clipboard.writeText(chatText).then(() => {
            toast.success('Chat copied to clipboard');
        }).catch((err) => {
            console.error('Failed to copy chat to clipboard:', err);
            toast.error('Failed to copy chat to clipboard');
        });
    };

    const downloadChatAsJson = (chat: Chats) => {
        const chatText = JSON.stringify(chat, null, 2);
        const blob = new Blob([chatText], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${chat.query}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const copyCodeToClipboard = (code: string) => {
        navigator.clipboard.writeText(code).then(() => {
            toast.success('Code copied to clipboard');
        }).catch((err) => {
            console.error('Failed to copy code to clipboard:', err);
            toast.error('Failed to copy Code to clipboard');
        });
    };

    const downloadCode = (file: File) => {
        const fileContent = JSON.stringify(file, null, 2);
        const blob = new Blob([fileContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${file.name}`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        setLoading(true);
        setInputDisabled(true);
        setError(null);

        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        const genAI = new GoogleGenerativeAI(apiKey);

        const schema = {
            description: "Search results in structured format",
            type: SchemaType.OBJECT,
            properties: {
                text: { type: SchemaType.STRING, description: "Detailed explanation of the topic" },
                resources: {
                    type: SchemaType.ARRAY,
                    items: { type: SchemaType.STRING },
                    description: "Links to resources or documentation"
                },
                files: {
                    type: SchemaType.ARRAY,
                    items: {
                        type: SchemaType.OBJECT,
                        properties: {
                            name: { type: SchemaType.STRING, description: "File name" },
                            content: { type: SchemaType.STRING, description: "File content" }
                        },
                        required: ["name", "content"]
                    },
                    description: "Files and its content"
                },
            },
            required: ["text"],
        };

        try {
            const model = genAI.getGenerativeModel({
                model: "models/gemini-1.5-flash",
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: schema,
                },
            });

            const prompt = `

            As an expert software developer, provide the following information for the query: "${searchQuery}"
            Make sure of the following things:
            1. In the response the text property should contain a to the point,specific and short explanation of the topic and do not add any codes in this.
            2. The resources property should contain links to resources or documentation of any relevant to that topics atleast 2 and maximum 6.
            3. The files property should contain files and its content related to the topic.

            NOTE: make sure if question is technical or related to programming, development, coding then provide code snippets every time with proper relevant resources.
            `;
            const startTime = Date.now();

            const result = await model.generateContent(prompt);

            const endTime = Date.now();

            const duration = endTime - startTime;

            const structuredResponse = JSON.parse(result.response.text());
            console.log("Structured response:", structuredResponse);
            setChatHistory((prevChats) => [
                ...prevChats,
                {
                    query: searchQuery,
                    response: structuredResponse,
                    responseTime: duration,
                    timestamp: new Date(),
                },
            ]);
            setSearchQuery("");
        } catch (err) {
            console.error("Search error:", err);
            setError("Failed to fetch search results. Please try again.");
        } finally {
            setLoading(false);
            setInputDisabled(false);
        }
    };

    const scrollToBottom = () => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior: "smooth",
            });
        }
    };

    const handleScroll = () => {
        if (chatContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
            setShowScrollButton(scrollTop < scrollHeight - clientHeight - 100);
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [chatHistory]);

    useEffect(() => {
        const chatContainer = chatContainerRef.current;
        if (chatContainer) {
            chatContainer.addEventListener("scroll", handleScroll);
            return () => chatContainer.removeEventListener("scroll", handleScroll);
        }
    }, []);

    return (
        <div className="pt-2 pr-2 pl-2 pb-2 w-full">
            <div className="border h-full flex flex-row justify-center items-center rounded-md bg-white dark:bg-zinc-900">
                <ResizablePanelGroup
                    direction="horizontal"
                >
                    <ResizablePanel className="w-full flex justify-center items-center" minSize={30} defaultSize={40}>
                        {/* Main Content */}
                        <div className="p-3 max-w-3xl w-full flex justify-center items-center min-w-3xl">
                            <div className="space-y-4">
                                {/* Header */}
                                {
                                    chatHistory.length == 0 && (
                                        <div className="transition-opacity duration-500">
                                            <div className="flex items-center justify-center mb-6">
                                                <Atom className="w-20 h-20 animate-pulse text-[#20B8CD]" strokeWidth={1.3} />
                                            </div>
                                            <h1 className="md:text-4xl text-2xl font-normal text-center mb-6">
                                                What can I help with?
                                            </h1>
                                            <HomeMarquee setSearchQuery={setSearchQuery} />
                                        </div>
                                    )
                                }

                                {/* Search Results */}
                                {
                                    error && (
                                        <div className="flex flex-row gap-2 items-center border w-fit p-1 rounded-xl bg-red-700/20 justify-center mx-auto">
                                            <div className="text-[12px] text-red-700">{error}</div>
                                        </div>
                                    )
                                }
                                {
                                    chatHistory.length > 0 && (
                                        <div className="space-y-4 h-[80vh] overflow-y-auto max-w-3xl" ref={chatContainerRef}>
                                            {chatHistory.map((chat, index) => (
                                                <div key={index} className="mb-4">
                                                    <BlurFade delay={0.25} inView>
                                                        <div className="text-[34px] flex flex-row items-center gap-2">{chat.query}</div>
                                                        <div className="flex flex-col gap-2">
                                                            <div className="flex gap-1 items-center border bg-muted w-fit pl-1 pr-1 rounded-md">
                                                                <Timer className="h-3 w-3" />
                                                                <h2 className="text-[12px]">Response Time: {chat.responseTime}ms</h2>
                                                            </div>
                                                            <div className="flex gap-1 border items-center bg-muted w-fit pl-1 pr-1 rounded-md">
                                                                <CalendarDays className="h-3 w-3" />
                                                                <h2 className="text-[12px]">{chat.timestamp.toString().split('(')[0].trim()}</h2>
                                                            </div>
                                                        </div>
                                                    </BlurFade>
                                                    <BlurFade delay={0.25 * 2} inView>
                                                        <div className="pt-6">
                                                            <div className="flex gap-2 items-center">
                                                                <Atom className="h-5 w-5" />
                                                                <h2 className="text-xl">Response:</h2>
                                                            </div>
                                                            <div className="pt-2">
                                                                <span>{chat.response.text}</span>
                                                            </div>


                                                            {chat.response.resources && (
                                                                <div className="pt-4 w-[300px]">
                                                                    <div className="flex gap-2 items-center">
                                                                        <Component className="h-5 w-5" />
                                                                        <h2 className="text-xl">Resources:</h2>
                                                                    </div>
                                                                    <div>
                                                                        {chat.response.resources.map((resource) => (
                                                                            <div className="pt-2">
                                                                                <LinkPreviewFetcher url={resource} />
                                                                            </div>

                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {chat.response.files && (
                                                                <div className="pt-4 w-[300px]">
                                                                    <div className="flex gap-2 items-center">
                                                                        <Code2 className="h-5 w-5" />
                                                                        <h2 className="text-xl">Code Files:</h2>
                                                                    </div>
                                                                    <div>
                                                                        {chat.response.files.map((file) => (
                                                                            <div className="pt-2">
                                                                                <div className="border rounded-lg p-1 w-fit bg-muted/50 cursor-pointer hover:bg-muted/100">
                                                                                    <div className="flex felx-row justify-between items-center gap-2">
                                                                                        <div className="flex flex-row items-center gap-1">
                                                                                            <Code />
                                                                                            <span className="overflow-x-auto w-[90%]">
                                                                                                {file.name}
                                                                                            </span>
                                                                                        </div>
                                                                                        <div className="flex flex-row items-center gap-1 text-blue-500 hover:underline hidden md:block" onClick={() => {
                                                                                            handleFileSelect(file);
                                                                                            setSplitView(true);
                                                                                        }}>
                                                                                            <ArrowUpRightSquare className="h-4 w-4" />
                                                                                        </div>
                                                                                        <Drawer>
                                                                                            <DrawerTrigger className="md:hidden block">
                                                                                                <div className="flex flex-row items-center gap-1 text-blue-500 hover:underline" onClick={() => {
                                                                                                    handleFileSelect(file);
                                                                                                    setSplitView(true);
                                                                                                }}>
                                                                                                    <ArrowUpRightSquare className="h-4 w-4" />
                                                                                                </div>
                                                                                            </DrawerTrigger>
                                                                                            <DrawerContent className="bg-zinc-900">
                                                                                                <DrawerHeader>
                                                                                                    <DrawerDescription>
                                                                                                        <div className="border-b w-[95vw] overflow-x-auto">
                                                                                                            <div className="flex flex-row w-fit items-center gap-2 bg-muted/30">
                                                                                                                {Array.from(openedFiles).map((file) => (
                                                                                                                    <div
                                                                                                                        key={file.name}
                                                                                                                        className={`flex items-center gap-2 cursor-pointer border-r `}
                                                                                                                        onClick={() => setSelectedFile(file)}
                                                                                                                    >
                                                                                                                        <div className={`flex flex-row items-center p-1 gap-1 ${selectedFile === file ? 'border-b-2 dark:border-white border-zinc-900' : ''}`}>
                                                                                                                            <h2 className="text-md">{file.name}</h2>
                                                                                                                            <X className="h-4 w-4 cursor-pointer" onClick={() => handleFileClose(file)} />
                                                                                                                        </div>

                                                                                                                    </div>
                                                                                                                ))}
                                                                                                            </div>
                                                                                                        </div>

                                                                                                        <div className="h-[60vh] w-[95vw] overflow-x-auto overflow-y-auto ">
                                                                                                            <SyntaxHighlighter language="python" showLineNumbers style={tomorrowNight} customStyle={{ backgroundColor: 'transparent' }}>
                                                                                                                {selectedFile?.content || ""}
                                                                                                            </SyntaxHighlighter>
                                                                                                            <div className="pt-4 pl-2 flex flex-row gap-2">
                                                                                                                <div className="flex flex-row items-center gap-1 border bg-muted w-fit pl-1 pr-1 rounded-md cursor-pointer hover:bg-muted/50" onClick={() => copyCodeToClipboard(selectedFile?.content || "")}>
                                                                                                                    <Copy className="h-3 w-3" />
                                                                                                                    <h2 className="text-[12px]">Copy</h2>
                                                                                                                </div>
                                                                                                                <div className="flex flex-row items-center gap-1 border bg-muted w-fit pl-1 pr-1 rounded-md cursor-pointer hover:bg-muted/50" onClick={() => { if (selectedFile) downloadCode(selectedFile); }}>
                                                                                                                    <Download className="h-3 w-3" />
                                                                                                                    <h2 className="text-[12px]">Download</h2>
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </DrawerDescription>
                                                                                                </DrawerHeader>

                                                                                            </DrawerContent>
                                                                                        </Drawer>
                                                                                    </div>
                                                                                </div>

                                                                            </div>

                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            <div className="pt-4 flex flex-row gap-2">
                                                                <div className="flex flex-row items-center gap-1 border bg-muted w-fit pl-1 pr-1 rounded-md cursor-pointer hover:bg-muted/50" onClick={() => copyChatToClipboard(chat)}>
                                                                    <Copy className="h-3 w-3" />
                                                                    <h2 className="text-[12px]">Copy</h2>
                                                                </div>
                                                                <div className="flex flex-row items-center gap-1 border bg-muted w-fit pl-1 pr-1 rounded-md cursor-pointer hover:bg-muted/50" onClick={() => downloadChatAsJson(chat)}>
                                                                    <Download className="h-3 w-3" />
                                                                    <h2 className="text-[12px]">Download</h2>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <hr className="border-t border-zinc-700 mt-4" />
                                                    </BlurFade>
                                                </div>

                                            ))}
                                        </div>
                                    )
                                }

                                {/* Search Input */}
                                <div className="p-2 rounded-full bg-muted/40">
                                    <div className="relative">
                                        <div className="absolute top-1/2 -translate-y-1/2 flex items-center space-x-2 pl-4">
                                            <Search className="w-4 h-4" />
                                        </div>
                                        <Input
                                            placeholder="Search anything..."
                                            className="w-full rounded-full py-6 pl-10 pr-[55px]"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            disabled={inputDisabled}
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleSearch();
                                                }
                                            }}
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-4">
                                            <Button
                                                className="w-8 h-8 rounded-full bg-[#20B8CD]/20 hover:bg-[#20B8CD]/40"
                                                variant="secondary"
                                                size="sm"
                                                onClick={handleSearch}
                                                disabled={loading}
                                            >
                                                {loading ? <Atom className="animate-spin" /> : <ArrowUp />}
                                            </Button>
                                        </div>
                                        {showScrollButton && (
                                            <Button
                                                className="absolute bottom-20 right-3 rounded-full h-8 w-8 animate-bounce"
                                                onClick={scrollToBottom}
                                                variant='secondary'
                                            >
                                                <ArrowDown className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>

                                </div>
                            </div>
                        </div>
                    </ResizablePanel>

                    {splitView && openedFiles.size > 0 && (
                        <>
                            
                            <ResizableHandle withHandle className="hidden md:flex" />
                            <ResizablePanel defaultSize={60} minSize={30} className="hidden md:block">
                                <motion.div
                                    initial={{ opacity: 0, x: 50 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.5 }}
                                >
                                <div className="border-b w-full overflow-x-auto">
                                    <div className="flex flex-row w-fit items-center bg-muted/30">
                                        {Array.from(openedFiles).map((file) => (
                                            <div
                                                key={file.name}
                                                className={`flex items-center gap-2 cursor-pointer border-r `}
                                                onClick={() => setSelectedFile(file)}
                                            >
                                                <div className={`flex flex-row items-center p-1 gap-1 ${selectedFile === file ? 'border-b-2 dark:border-white border-zinc-900' : ''}`}>
                                                   <h2 className="text-md">{file.name}</h2>
                                                <X className="h-4 w-4 cursor-pointer" onClick={() => handleFileClose(file)} /> 
                                                </div>
                                                
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="h-[93vh] overflow-y-auto ">
                                    <SyntaxHighlighter language="python" showLineNumbers style={tomorrowNight} customStyle={{ backgroundColor: 'transparent' }}>
                                        {selectedFile?.content || ""}
                                    </SyntaxHighlighter>
                                    <div className="pt-4 pl-2 flex flex-row gap-2">
                                        <div className="flex flex-row items-center gap-1 border bg-muted w-fit pl-1 pr-1 rounded-md cursor-pointer hover:bg-muted/50" onClick={() => copyCodeToClipboard(selectedFile?.content || "")}>
                                            <Copy className="h-3 w-3" />
                                            <h2 className="text-[12px]">Copy</h2>
                                        </div>
                                        <div className="flex flex-row items-center gap-1 border bg-muted w-fit pl-1 pr-1 rounded-md cursor-pointer hover:bg-muted/50" onClick={() => { if (selectedFile) downloadCode(selectedFile); }}>
                                            <Download className="h-3 w-3" />
                                            <h2 className="text-[12px]">Download</h2>
                                        </div>
                                    </div>
                                </div>
                                </motion.div>
                            </ResizablePanel>
                            
                        </>
                    )}

                </ResizablePanelGroup>
            </div>
        </div>
    );
};

export default HomeSearch;
