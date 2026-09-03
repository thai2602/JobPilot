import { useState } from 'react';

export const useFileUpload = () => {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedFile = e.target.files[0];
            const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            
            if (!allowedTypes.includes(selectedFile.type)) {
                setUploadError('Vui lòng chọn file PDF hoặc Word (.doc, .docx).');
                setFile(null);
                return;
            }

            setFile(selectedFile);
            setUploadError(null);
        }
    };

    const uploadFile = async () => {
        if (!file) return;

        setIsUploading(true);
        setUploadError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            
            // Mock API delay
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            console.log('File uploaded successfully');
            setFile(null); // Reset after upload
        } catch (err: any) {
            setUploadError(err.message || 'Lỗi khi tải file lên.');
        } finally {
            setIsUploading(false);
        }
    };

    return {
        file,
        isUploading,
        uploadError,
        handleFileChange,
        uploadFile
    };
};
