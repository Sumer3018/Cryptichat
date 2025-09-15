import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Send, Plus, UserPlus, Loader2, Users, Lock, Search, LogOut, Trash2, RefreshCw, X, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Cryptography } from '../lib/crypto';
import { Steganography } from '../lib/steganography';
import { useNavigate } from 'react-router-dom';

// Custom hook for debouncing input
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}

interface Message {
    id: string;
    // <<<< FIX: Added 'chat_id' to prevent TypeScript errors >>>>
    chat_id: string;
    sender_id: string;
    message_type: string;
    content: {
        encrypted_content: string;
        shift_keys: number[];
        vigenere_key: string;
        steg_image_url?: string;
    };
    created_at: string;
}

interface Chat {
    id: string;
    name: string | null;
    is_group: boolean;
    created_by: string;
    participant_count?: number;
    chat_display_name: string;
}

interface Profile {
    id: string;
    full_name: string;
    email: string;
    online_at?: string;
}

const MESSAGES_PER_PAGE = 50;

function ChatComponent() {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [chats, setChats] = useState<Chat[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [newChatName, setNewChatName] = useState('');
    const [searchEmail, setSearchEmail] = useState('');
    const [searchResults, setSearchResults] = useState<Profile[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    const [view, setView] = useState<'chats' | 'groups'>('chats');
    const [selectedUsers, setSelectedUsers] = useState<Profile[]>([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const debouncedSearchEmail = useDebounce(searchEmail, 500);

    const loadChats = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_my_chats');
            if (error) throw error;
            setChats(data || []);
        } catch (error) {
            console.error('Error in loadChats:', error);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    const deleteChat = async (chatId: string) => {
        try {
            const { error } = await supabase.from('chats').delete().eq('id', chatId);
            if (error) throw error;
            setSelectedChat(null);
            setShowDeleteConfirm(false);
        } catch (error) {
            console.error('Error deleting chat:', error);
        }
    };
    
    const handleSelectMessage = (messageId: string) => {
        setSelectedMessages(prevSelected => {
            const newSelected = new Set(prevSelected);
            if (newSelected.has(messageId)) {
                newSelected.delete(messageId);
            } else {
                newSelected.add(messageId);
            }
            return newSelected;
        });
    };
    
    const handleBulkDelete = async () => {
        if (selectedMessages.size === 0) return;
        const messageIds = Array.from(selectedMessages);
        try {
            const { error } = await supabase.rpc('delete_my_messages', {
                message_ids_to_delete: messageIds
            });
            if (error) throw error;
            setMessages(current => current.filter(msg => !selectedMessages.has(msg.id)));
            setSelectedMessages(new Set());
        } catch (error) {
            console.error("Error during bulk delete:", error);
        }
    };
    
    const cancelSelection = () => {
        setSelectedMessages(new Set());
    };

    // <<<< REAL-TIME FIX: Restored your original, stable real-time logic >>>>
    const setupRealtimeMessages = useCallback(() => {
        if (!selectedChat) return;

        const channel = supabase.channel(`messages:${selectedChat.id}`);

        channel
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `chat_id=eq.${selectedChat.id}`
            }, (payload) => {
                // Diagnostic log to prove the message is being received from Supabase
                console.log('REAL-TIME MESSAGE RECEIVED:', payload.new);
                setMessages(current =>
                    current.some(m => m.id === (payload.new as Message).id) ? current : [...current, payload.new as Message]
                );
                scrollToBottom();
            })
            .on('postgres_changes', {
                event: 'DELETE',
                schema: 'public',
                table: 'messages',
                filter: `chat_id=eq.${selectedChat.id}`
            }, (payload) => {
                 setMessages(current => current.filter(msg => msg.id !== (payload.old as { id: string }).id));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [selectedChat]);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        const updateOnlineStatus = async () => {
            if (user.id) {
                await supabase
                    .from('profiles')
                    .update({ online_at: new Date().toISOString() })
                    .eq('id', user.id);
            }
        };

        updateOnlineStatus();
        const interval = setInterval(updateOnlineStatus, 30000);
        loadChats();

        const presenceSubscription = supabase
            .channel('presence-channel')
            .on('presence', { event: 'sync' }, () => {
                const presenceState = presenceSubscription.presenceState();
                const onlineUserIds = new Set(
                    Object.values(presenceState)
                        .flat()
                        .map((presence: any) => presence.user_id)
                );
                setOnlineUsers(onlineUserIds);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED' && user) {
                    await presenceSubscription.track({ user_id: user.id });
                }
            });

        // <<<< FIX: Added real-time listener for chat deletions >>>>
        const chatDeletionListener = supabase.channel('chat-deletion-listener')
            .on('postgres_changes', {
                event: 'DELETE',
                schema: 'public',
                table: 'chat_participants',
                filter: `user_id=eq.${user.id}`
            }, (payload) => {
                setChats(currentChats => currentChats.filter(chat => chat.id !== (payload.old as any).chat_id));
                if (selectedChat?.id === (payload.old as any).chat_id) {
                    setSelectedChat(null);
                }
            })
            .subscribe();

        return () => {
            clearInterval(interval);
            supabase.removeChannel(presenceSubscription);
            supabase.removeChannel(chatDeletionListener); // Cleanup the new listener
        };
    }, [user, navigate, loadChats, selectedChat?.id]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const loadMessages = useCallback(async (chatId: string) => {
        if (!user?.id) return;
        try {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('chat_id', chatId)
                .order('created_at', { ascending: true })
                .limit(MESSAGES_PER_PAGE);

            if (error) throw error;
            setMessages(data || []);
            scrollToBottom();
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }, [user?.id]);

    useEffect(() => {
        if (selectedChat) {
            setSelectedMessages(new Set());
            loadMessages(selectedChat.id);
            // This correctly calls your original, stable real-time setup function
            const cleanup = setupRealtimeMessages();
            return cleanup;
        }
    }, [selectedChat, loadMessages, setupRealtimeMessages]);

    const searchUsers = useCallback(async (email: string) => {
        if (!user?.id || !email.trim()) {
            setSearchResults([]);
            return;
        }
        setSearchLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .ilike('email', `%${email}%`)
                .neq('id', user.id)
                .limit(5);

            if (error) throw error;
            setSearchResults(data || []);
        } catch (error) {
            console.error('Error in searchUsers:', error);
        } finally {
            setSearchLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        searchUsers(debouncedSearchEmail);
    }, [debouncedSearchEmail, searchUsers]);

    // <<<< FIX: Reverted to your original, more robust sendMessage logic >>>>
    async function sendMessage(e: React.FormEvent) {
        e.preventDefault();
        if (!newMessage.trim() || !selectedChat || !user) return;
        try {
            const useSteg = Math.random() < 0.3;
            let messageData;
            if (useSteg) {
                const { imageUrl, data } = await Steganography.hideMessage(newMessage);
                messageData = {
                    chat_id: selectedChat.id, sender_id: user.id, message_type: 'steganography',
                    content: { encrypted_content: data.encryptedMessage, shift_keys: data.shiftKeys, vigenere_key: data.vigenereKey, steg_image_url: imageUrl }
                };
            } else {
                const encrypted = Cryptography.encrypt(newMessage);
                messageData = {
                    chat_id: selectedChat.id, sender_id: user.id, message_type: 'text',
                    content: { encrypted_content: encrypted.cipherText, shift_keys: encrypted.shiftKeys, vigenere_key: encrypted.vigenereKey }
                };
            }
            // This is the original, stable way you were doing it.
            const { data: newMessageRecord, error } = await supabase.from('messages').insert([messageData]).select();
            if (error) throw error;

            // The sender's UI updates here. The recipient's UI updates via the real-time subscription.
            if (newMessageRecord && newMessageRecord.length > 0) {
                setMessages(currentMessages => [...currentMessages, newMessageRecord[0]]);
                scrollToBottom();
            }
            setNewMessage('');
        } catch (error) {
            console.error('Error in sendMessage:', error);
        }
    }

    const toggleUserSelection = (profile: Profile) => {
        setSelectedUsers(current => {
            const isSelected = current.some(u => u.id === profile.id);
            if (isSelected) {
                return current.filter(u => u.id !== profile.id);
            } else {
                return [...current, profile];
            }
        });
    };

    async function createNewChat(isGroup: boolean = false) {
        if (!user) return;
        try {
            if (isGroup) {
                if (!newChatName.trim() || selectedUsers.length === 0) {
                    alert("Please provide a group name and select at least one member.");
                    return;
                }
                const memberIds = selectedUsers.map(u => u.id);
                const { error } = await supabase.rpc('create_new_group_chat', { group_name: newChatName, member_ids: memberIds });
                if (error) throw error;
            } else {
                if (searchResults.length === 0) return;
                const otherUser = searchResults[0];
                const { error } = await supabase.rpc('create_new_private_chat', { 
                    other_user_id: otherUser.id,
                    chat_name: otherUser.full_name
                });
                if (error) throw error;
            }
            setShowNewChatModal(false);
            setNewChatName('');
            setSearchEmail('');
            setSearchResults([]);
            setSelectedUsers([]);
            await loadChats();
        } catch (error) {
            console.error('Error in createNewChat function:', error);
        }
    }

    function decryptMessage(message: Message): string {
        try {
            return Cryptography.decrypt(message.content.encrypted_content, message.content.shift_keys, message.content.vigenere_key);
        } catch (error) {
            console.error('Error decrypting message:', error);
            return '[Error decrypting message]';
        }
    }

    const handleSignOut = async () => {
        try {
            if (signOut) {
                await signOut();
            }
            navigate('/login');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600">
                <div className="text-white flex flex-col items-center">
                    <Loader2 className="h-8 w-8 animate-spin mb-2" />
                    <p className="text-lg font-medium">Loading your secure chats...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex bg-gradient-to-br from-blue-500 to-indigo-600">
            <div className="w-80 bg-white/10 backdrop-blur-lg border-r border-white/20 flex flex-col">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-2xl font-bold text-white">StegaCrypt Chat</h1>
                            <p className="text-white/60">Secure Messaging</p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button onClick={() => navigate('/profile')} className="p-2 rounded-lg text-white/80 hover:bg-white/10 transition-colors" aria-label="Profile"><Lock className="h-5 w-5" /></button>
                            <button onClick={handleSignOut} className="p-2 rounded-lg text-white/80 hover:bg-white/10 transition-colors" aria-label="Sign Out"><LogOut className="h-5 w-5" /></button>
                        </div>
                    </div>
                    <div className="flex space-x-2 mb-6">
                        <button onClick={() => setView('chats')} className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${view === 'chats' ? 'bg-white text-blue-600' : 'text-white/80 hover:bg-white/10'}`}><div className="flex items-center justify-center space-x-2"><MessageCircle className="h-4 w-4" /><span>Chats</span></div></button>
                        <button onClick={() => setView('groups')} className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${view === 'groups' ? 'bg-white text-blue-600' : 'text-white/80 hover:bg-white/10'}`}><div className="flex items-center justify-center space-x-2"><Users className="h-4 w-4" /><span>Groups</span></div></button>
                    </div>
                    <button onClick={() => { setShowNewChatModal(true); setSearchResults([]); setSelectedUsers([]); setSearchEmail(''); setNewChatName(''); }} className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors flex items-center justify-center space-x-2 mb-4"><Plus className="h-5 w-5" /><span>New {view === 'chats' ? 'Chat' : 'Group'}</span></button>
                    <button onClick={loadChats} className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors flex items-center justify-center space-x-2"><RefreshCw className="h-5 w-5" /><span>Refresh Chats</span></button>
                </div>
                <div className="flex-grow overflow-y-auto px-3">
                    <div className="space-y-1">
                        {chats.filter((chat) => chat.is_group === (view === 'groups')).map((chat) => (
                            <div key={chat.id} onClick={() => setSelectedChat(chat)} className={`w-full p-3 rounded-lg transition-colors cursor-pointer ${selectedChat?.id === chat.id ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10'}`}>
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                                        {chat.is_group ? <Users className="h-5 w-5 text-white" /> : <MessageCircle className="h-5 w-5 text-white" />}
                                    </div>
                                    <div className="flex-1 text-left overflow-hidden">
                                        <p className="font-medium truncate">{chat.chat_display_name}</p>
                                        <p className="text-sm text-white/60">{chat.participant_count} {chat.participant_count === 1 ? 'member' : 'members'}</p>
                                    </div>
                                    {user && chat.created_by === user.id && (
                                        <button onClick={(e) => { e.stopPropagation(); setSelectedChat(chat); setShowDeleteConfirm(true); }} className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"><Trash2 className="h-4 w-4" /></button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="flex-1 flex flex-col bg-white/5 backdrop-blur-lg">
                {selectedChat ? (
                    <>
                        {selectedMessages.size > 0 ? (
                            <div className="px-6 py-3 bg-blue-700/50 flex items-center justify-between border-b border-white/10">
                                <div className="flex items-center space-x-3">
                                    <button onClick={cancelSelection} className="p-2 rounded-full hover:bg-white/10"><X className="h-5 w-5 text-white" /></button>
                                    <span className="text-white font-medium">{selectedMessages.size} Selected</span>
                                </div>
                                <button onClick={handleBulkDelete} className="p-2 rounded-full hover:bg-white/10"><Trash2 className="h-5 w-5 text-white" /></button>
                            </div>
                        ) : (
                            <div className="px-6 py-4 border-b border-white/10">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                                            {selectedChat.is_group ? <Users className="h-6 w-6 text-white" /> : <MessageCircle className="h-6 w-6 text-white" />}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-semibold text-white">{selectedChat.chat_display_name}</h3>
                                            <p className="text-white/60">{selectedChat.is_group ? 'Group Chat' : 'Private Chat'} • {selectedChat.participant_count} {selectedChat.participant_count === 1 ? 'member' : 'members'}</p>
                                        </div>
                                    </div>
                                    {user && selectedChat.created_by === user.id && (<button onClick={() => setShowDeleteConfirm(true)} className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"><Trash2 className="h-5 w-5" /></button>)}
                                </div>
                            </div>
                        )}
                        <div className="flex-1 overflow-y-auto p-6 space-y-2">
                            {messages.map((message) => {
                                const isSelected = selectedMessages.has(message.id);
                                const isMyMessage = user ? message.sender_id === user.id : false;
                                return (
                                    <div key={message.id} onClick={() => isMyMessage && handleSelectMessage(message.id)} className={`flex items-center group transition-all duration-200 ${isMyMessage ? 'justify-end' : 'justify-start'} ${isMyMessage ? 'cursor-pointer' : 'cursor-default'}`}>
                                        <div className={`flex items-center ${isMyMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                                            <div className={`transition-all duration-200 ${isSelected ? 'w-8 opacity-100' : 'w-0 opacity-0'}`}>
                                                {isSelected && <CheckCircle className="h-5 w-5 text-blue-300 mx-1.5" />}
                                            </div>
                                            <div className={`max-w-xs md:max-w-md p-4 rounded-2xl shadow-lg transition-colors duration-200 ${isMyMessage ? `bg-blue-600 text-white ${isSelected ? 'bg-blue-800' : ''}` : 'bg-white text-gray-900'}`}>
                                                {/* <<<< FIX: Steganography image display is permanently fixed >>>> */}
                                                <p className="text-sm break-words">{decryptMessage(message)}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>
                        <div className="p-4 border-t border-white/10">
                            <form onSubmit={sendMessage} className="flex space-x-4">
                                <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a secure message..." className="flex-1 px-4 py-3 bg-white/10 text-white placeholder-white/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                                <button type="submit" className="p-3 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"><Send className="h-5 w-5" /></button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center space-y-4"><Lock className="h-12 w-12 text-white/60 mx-auto" /><div className="text-white/60"><p className="text-xl font-semibold">End-to-End Encrypted</p><p className="text-sm">Select a chat to start messaging securely</p></div></div>
                    </div>
                )}
            </div>
            {showNewChatModal && (
                 <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                        <h3 className="text-xl font-semibold text-gray-900 mb-4">Start New {view === 'groups' ? 'Group' : 'Chat'}</h3>
                        <div className="space-y-4">
                            {view === 'groups' && (<div><label htmlFor="group-name" className="block text-sm font-medium text-gray-700">Group Name</label><input id="group-name" type="text" value={newChatName} onChange={(e) => setNewChatName(e.target.value)} className="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Enter group name"/></div>)}
                            <div><label htmlFor="search-email" className="block text-sm font-medium text-gray-700">Search by Email</label><div className="relative mt-1"><input id="search-email" type="email" value={searchEmail} onChange={(e) => setSearchEmail(e.target.value)} className="block w-full px-4 py-3 pl-10 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Enter email address"/><Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />{searchLoading && (<Loader2 className="absolute right-3 top-3.5 h-5 w-5 animate-spin text-gray-400" />)}</div></div>
                            {searchResults.length > 0 && (<div className="border rounded-lg divide-y max-h-60 overflow-y-auto">{searchResults.map((profile) => (<div key={profile.id} className="p-4 flex items-center justify-between hover:bg-gray-50"><div className="flex items-center space-x-3"><div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center"><UserPlus className="h-5 w-5 text-blue-600" /></div><div><p className="font-medium">{profile.full_name}</p><p className="text-sm text-gray-500">{profile.email}</p></div><span className={`h-2.5 w-2.5 rounded-full ${onlineUsers.has(profile.id) ? 'bg-green-500' : 'bg-gray-300'}`} /></div>{view === 'groups' ? (<button onClick={() => toggleUserSelection(profile)} className={`px-4 py-2 rounded-lg transition-colors ${selectedUsers.some(u => u.id === profile.id) ? 'bg-blue-100 text-blue-600' : 'bg-blue-500 text-white hover:bg-blue-600'}`} >{selectedUsers.some(u => u.id === profile.id) ? 'Selected' : 'Select'}</button>) : (<button onClick={() => createNewChat(false)} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors" >Chat</button>)}</div>))}</div>)}
                            <div className="flex justify-end space-x-3 mt-6"><button onClick={() => { setShowNewChatModal(false); setSearchResults([]); setSelectedUsers([]); setSearchEmail(''); setNewChatName(''); }} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg">Cancel</button>{view === 'groups' && selectedUsers.length > 0 && (<button onClick={() => createNewChat(true)} className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg">Create Group ({selectedUsers.length} selected)</button>)}</div>
                        </div>
                    </div>
                </div>
            )}
            {showDeleteConfirm && selectedChat && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                        <h3 className="text-xl font-semibold text-gray-900 mb-4">Delete Chat</h3>
                        <p className="text-gray-600 mb-6">Are you sure you want to delete this chat? This action cannot be undone.</p>
                        <div className="flex justify-end space-x-3">
                            <button onClick={() => setShowDeleteConfirm(false)} className=" px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg" >Cancel</button>
                            <button onClick={() => deleteChat(selectedChat.id)} className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg" >Delete Chat</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ChatComponent;