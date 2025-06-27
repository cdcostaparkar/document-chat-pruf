import { useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';


export default function IngestPage() {
  const router = useRouter();
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      const docxFiles = droppedFiles.filter(file => 
        file.name.toLowerCase().endsWith('.docx')
      );
      setFiles(prev => [...prev, ...docxFiles]);
    }
  }, []);

  const handleFileInput = (e) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const docxFiles = selectedFiles.filter(file => 
        file.name.toLowerCase().endsWith('.docx')
      );
      setFiles(prev => [...prev, ...docxFiles]);
    }
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllFiles = () => {
    setFiles([]);
    setUploadStatus(null);
  };

  const uploadFiles = async () => {
    if (files.length === 0) {
      setUploadStatus({
        type: 'error',
        message: 'Please select at least one DOCX file'
      });
      return;
    }

    setIsUploading(true);
    setUploadStatus(null);

    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/ingest`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setUploadStatus({
        type: 'success',
        message: result.message
      });
      
      // Clear files after successful upload
      setTimeout(() => {
        setFiles([]);
      }, 2000);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus({
        type: 'error',
        message: 'Failed to upload files. Please check if the server is running.'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const checkHealth = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/health`);
      const health = await response.json();
      setUploadStatus({
        type: 'info',
        message: `Server Status: ${health.status}, Models: ${health.models_initialized ? 'Ready' : 'Not Ready'}, Vectorstore: ${health.vectorstore_loaded ? 'Loaded' : 'Empty'}`
      });
    } catch (error) {
      setUploadStatus({
        type: 'error',
        message: 'Server is not responding. Please check if it\'s running on port 8000.'
      });
    }
  };

  // const clearVectorstore = async () => {
  //   if (!confirm('Are you sure you want to clear all ingested documents? This action cannot be undone.')) {
  //     return;
  //   }

  //   try {
  //     const response = await fetch(`${NEXT_PUBLIC_API_BASE_URL}/vectorstore`, {
  //       method: 'DELETE',
  //     });

  //     if (!response.ok) {
  //       throw new Error(`HTTP error! status: ${response.status}`);
  //     }

  //     const result = await response.json();
  //     setUploadStatus({
  //       type: 'success',
  //       message: result.message
  //     });
  //   } catch (error) {
  //     setUploadStatus({
  //       type: 'error',
  //       message: 'Failed to clear vectorstore.'
  //     });
  //   }
  // };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <>
      <Head>
        <title>Document Ingestion</title>
        <meta name="description" content="Upload documents for processing" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-zinc-900 text-white">
        {/* Header */}
        <div className="bg-zinc-800 border-b border-zinc-700 p-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/chat')}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                ← Back to Chat
              </button>
              <h1 className="text-2xl font-bold">Document Ingestion</h1>
            </div>
            <div className="flex gap-2">
              <button
                onClick={checkHealth}
                className="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Check Status
              </button>
              {/* <button
                onClick={clearVectorstore}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Clear All
              </button> */}
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-6">
          {/* Status Messages */}
          {uploadStatus && (
            <div className={`mb-6 p-4 rounded-lg ${
              uploadStatus.type === 'success' ? 'bg-green-600' :
              uploadStatus.type === 'error' ? 'bg-red-600' :
              'bg-blue-600'
            }`}>
              {uploadStatus.message}
            </div>
          )}

          {/* Upload Area */}
          <div className="bg-zinc-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Upload DOCX Documents</h2>
            
            {/* Drag and Drop Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-zinc-600 hover:border-zinc-500'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="space-y-4">
                <div className="text-4xl">📄</div>
                <div>
                  <p className="text-lg font-medium">
                    Drag and drop DOCX files here
                  </p>
                  <p className="text-zinc-400">or</p>
                </div>
                <label className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg cursor-pointer transition-colors inline-block">
                  Browse Files
                  <input
                    type="file"
                    multiple
                    accept=".docx"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </label>
                <p className="text-sm text-zinc-400">
                  Only DOCX files are supported
                </p>
              </div>
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">
                    Selected Files ({files.length})
                  </h3>
                  <button
                    onClick={clearAllFiles}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    Clear All
                  </button>
                </div>
                
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-zinc-700 p-3 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{file.name}</div>
                        <div className="text-sm text-zinc-400">
                          {formatFileSize(file.size)}
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-red-400 hover:text-red-300 ml-4 p-1"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex gap-4">
                  <button
                    onClick={uploadFiles}
                    disabled={isUploading || files.length === 0}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-zinc-600 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
                  >
                    {isUploading && (
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                    )}
                    {isUploading ? 'Processing...' : 'Ingest Documents'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-zinc-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Instructions</h3>
            <div className="space-y-3 text-zinc-300">
              <div className="flex items-start gap-3">
                <span className="text-blue-400 font-semibold">1.</span>
                <span>Upload one or more DOCX documents using the drag-and-drop area or file browser above.</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-blue-400 font-semibold">2.</span>
                <span>Click "Ingest Documents" to process and store the documents in the vector database.</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-blue-400 font-semibold">3.</span>
                <span>Once ingested, you can ask questions about the documents in the chat interface.</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-blue-400 font-semibold">4.</span>
                <span>Use "Check Status" to verify server health and vectorstore status.</span>
              </div>
              {/* <div className="flex items-start gap-3">
                <span className="text-blue-400 font-semibold">5.</span>
                <span>Use "Clear All" to remove all ingested documents from the database.</span>
              </div> */}
            </div>

            <div className="mt-6 p-4 bg-yellow-600/20 border border-yellow-600/30 rounded-lg">
              <h4 className="font-semibold text-yellow-400 mb-2">Prerequisites:</h4>
              <ul className="text-sm text-zinc-300 space-y-1">
                <li>• Server status must be healthy and ready</li>
                <li>• Only DOCX, PDF, TXT and CSV files are supported for ingestion</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}