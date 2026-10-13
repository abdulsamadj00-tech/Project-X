
import React from 'react';
import { ClipboardIcon, XMarkIcon } from './icons';

interface ModalProps {
    title: string;
    content: string;
    onClose: () => void;
}

const Modal: React.FC<ModalProps> = ({ title, content, onClose }) => {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-primary-100/90 backdrop-blur-2xl rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] w-full max-w-2xl max-h-[90vh] flex flex-col border border-primary-300/30">
                <div className="flex justify-between items-center p-5 border-b border-primary-300/20">
                    <h2 className="text-xl font-bold text-white font-display">{title}</h2>
                    <button onClick={onClose} className="text-white0 hover:text-white transition-colors p-2 rounded-lg hover:bg-primary-200/50">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto">
                    <textarea
                        readOnly
                        value={content}
                        className="w-full h-96 p-4 bg-primary-200/50 border border-primary-300/30 rounded-xl font-mono text-sm text-primary-800 resize-none focus:outline-none"
                    />
                </div>
                <div className="flex justify-end p-4 border-t border-primary-300/20">
                    <button
                        onClick={handleCopy}
                        className="flex items-center bg-brand-500 text-white font-bold py-2.5 px-5 rounded-xl shadow-[0_0_20px_rgba(0,213,255,0.25)] hover:shadow-[0_0_30px_rgba(0,213,255,0.5)] hover:bg-brand-400 transition-all active:scale-95"
                    >
                        <ClipboardIcon className="h-5 w-5 mr-2" />
                        {copied ? 'Copied!' : 'Copy to Clipboard'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Modal;

