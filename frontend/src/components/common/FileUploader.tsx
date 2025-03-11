import React, { useCallback, useState, useRef } from 'react';
import { ApiService } from '@/services/ApiService';

/**
 * File upload status type
 */
type FileStatus = 'idle' | 'uploading' | 'success' | 'error';

/**
 * Uploaded file info
 */
export interface UploadedFile {
  id: string;
  url: string;
  name: string;
  size: number;
  type: string;
}

/**
 * Props for FileUploader component
 */
interface FileUploaderProps {
  onFileUpload: (files: UploadedFile[]) => void;
  acceptedFileTypes?: string;
  maxFileSize?: number; // in MB
  multiple?: boolean;
  metadata?: Record<string, any>;
  className?: string;
  disabled?: boolean;
}

/**
 * FileUploader Component
 * 
 * A drag-and-drop file uploader with preview and progress indication.
 * Handles file validation, uploading to the server, and provides feedback.
 */
export const FileUploader: React.FC<FileUploaderProps> = ({
  onFileUpload,
  acceptedFileTypes = '.pdf,.jpg,.jpeg,.png,.doc,.docx',
  maxFileSize = 10, // 10MB default
  multiple = false,
  metadata = {},
  className = '',
  disabled = false
}) => {
  // References and state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [status, setStatus] = useState<FileStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  
  /**
   * Handle file selection
   */
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    // Reset states
    setStatus('uploading');
    setErrorMessage('');
    setUploadProgress(0);
    
    // Convert FileList to array for processing
    const fileArray = Array.from(files);
    
    // Validate files
    const validationError = validateFiles(fileArray);
    if (validationError) {
      setStatus('error');
      setErrorMessage(validationError);
      return;
    }
    
    // Upload files
    uploadFiles(fileArray);
  }, [acceptedFileTypes, maxFileSize, metadata, onFileUpload]);
  
  /**
   * Validate files before upload
   */
  const validateFiles = (files: File[]): string | null => {
    // Check file types
    const acceptedTypesArray = acceptedFileTypes.split(',').map(type => type.trim().toLowerCase());
    
    for (const file of files) {
      // Check file size
      if (file.size > maxFileSize * 1024 * 1024) {
        return `File "${file.name}" exceeds the maximum size of ${maxFileSize}MB.`;
      }
      
      // Check file type
      const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
      if (!acceptedTypesArray.includes(fileExtension) && !acceptedTypesArray.includes('.*')) {
        return `File "${file.name}" has an unsupported file type. Allowed types: ${acceptedFileTypes}`;
      }
    }
    
    return null;
  };
  
  /**
   * Upload files to the server
   */
  const uploadFiles = async (files: File[]) => {
    try {
      const uploadedFiles: UploadedFile[] = [];
      
      // Upload each file sequentially
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const progress = Math.round((i / files.length) * 50); // First half of progress
        setUploadProgress(progress);
        
        // Upload file
        const result = await ApiService.uploadFile(file, metadata);
        
        // Add uploaded file info
        uploadedFiles.push({
          id: result.id,
          url: result.url,
          name: file.name,
          size: file.size,
          type: file.type
        });
        
        // Update progress
        const newProgress = Math.round(50 + (i + 1) / files.length * 50); // Second half of progress
        setUploadProgress(newProgress);
      }
      
      // Complete upload
      setStatus('success');
      setUploadProgress(100);
      onFileUpload(uploadedFiles);
      
      // Reset after a delay
      setTimeout(() => {
        setStatus('idle');
        setUploadProgress(0);
      }, 1500);
      
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to upload files');
    }
  };
  
  /**
   * Handle drag-and-drop events
   */
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);
  
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    if (!disabled) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [disabled, handleFileSelect]);
  
  /**
   * Handle browse button click
   */
  const handleBrowseClick = useCallback(() => {
    if (fileInputRef.current && !disabled) {
      fileInputRef.current.click();
    }
  }, [disabled]);
  
  /**
   * Handle file input change
   */
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
    // Reset the input value to allow selecting the same file again
    if (e.target && e.target instanceof HTMLInputElement) {
      e.target.value = '';
    }
  }, [handleFileSelect]);
  
  /**
   * Build class name based on component state
   */
  const containerClassName = `
    file-uploader 
    ${isDragOver ? 'file-uploader--dragover' : ''} 
    ${disabled ? 'file-uploader--disabled' : ''} 
    ${className}
  `.trim();
  
  return (
    <div className={containerClassName}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFileTypes}
        multiple={multiple}
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
        disabled={disabled}
      />
      
      {/* Drag and drop area */}
      <div
        className="file-uploader__dropzone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
      >
        <div className="file-uploader__content">
          {status === 'idle' && (
            <>
              <i className="bi bi-cloud-upload file-uploader__icon"></i>
              <div className="file-uploader__text">
                <span>Drag and drop files here, or</span>
                <span className="file-uploader__browse">browse files</span>
              </div>
              <div className="file-uploader__hint text-muted">
                {multiple ? 'Multiple files supported' : 'Single file only'}
                {maxFileSize && <span> (Max size: {maxFileSize}MB)</span>}
              </div>
              <div className="file-uploader__types text-muted">
                Accepted file types: {acceptedFileTypes}
              </div>
            </>
          )}
          
          {status === 'uploading' && (
            <>
              <i className="bi bi-arrow-clockwise file-uploader__icon rotating"></i>
              <div className="file-uploader__text">Uploading files...</div>
              <div className="progress w-75 mt-2">
                <div 
                  className="progress-bar progress-bar-striped progress-bar-animated"
                  role="progressbar"
                  style={{ width: `${uploadProgress}%` }}
                  aria-valuenow={uploadProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  {uploadProgress}%
                </div>
              </div>
            </>
          )}
          
          {status === 'success' && (
            <>
              <i className="bi bi-check-circle-fill file-uploader__icon text-success"></i>
              <div className="file-uploader__text text-success">Files uploaded successfully!</div>
            </>
          )}
          
          {status === 'error' && (
            <>
              <i className="bi bi-exclamation-circle-fill file-uploader__icon text-danger"></i>
              <div className="file-uploader__text text-danger">Upload failed</div>
              <div className="file-uploader__error">{errorMessage}</div>
              <button 
                className="btn btn-outline-primary btn-sm mt-3"
                onClick={(e) => {
                  e.stopPropagation();
                  setStatus('idle');
                }}
              >
                Try Again
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileUploader;