import { useState } from 'react';
import { runAllTests, simulateUploadFlow } from './supabaseTests';

export default function SupabaseTestRunner() {
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [currentTest, setCurrentTest] = useState('');
  const [expanded, setExpanded] = useState(true);

  const handleRunAllTests = async () => {
    setTesting(true);
    setTestResults(null);
    setCurrentTest('Running all tests...');
    
    try {
      console.clear();
      log('%c🧪 STUDYHIVE SUPABASE TEST SUITE 🧪', 'color: #2563eb; font-size: 16px; font-weight: bold;');
      
      const result = await runAllTests();
      
      setTestResults({
        type: 'all',
        success: result,
        timestamp: new Date().toLocaleTimeString()
      });
      setCurrentTest('');
    } catch (error) {
      console.error('Test error:', error);
      setTestResults({
        type: 'all',
        success: false,
        error: error.message,
        timestamp: new Date().toLocaleTimeString()
      });
      setCurrentTest('');
    }
    
    setTesting(false);
  };

  const handleSimulateUpload = async () => {
    setTesting(true);
    setTestResults(null);
    setCurrentTest('Simulating upload flow...');
    
    try {
      console.clear();
      log('%c📤 UPLOAD FLOW SIMULATION 📤', 'color: #10b981; font-size: 16px; font-weight: bold;');
      
      const result = await simulateUploadFlow();
      
      setTestResults({
        type: 'upload',
        success: result,
        timestamp: new Date().toLocaleTimeString()
      });
      setCurrentTest('');
    } catch (error) {
      console.error('Upload simulation error:', error);
      setTestResults({
        type: 'upload',
        success: false,
        error: error.message,
        timestamp: new Date().toLocaleTimeString()
      });
      setCurrentTest('');
    }
    
    setTesting(false);
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      width: '350px',
      background: '#1a1a1a',
      border: '1px solid #2563eb',
      borderRadius: 12,
      padding: 16,
      fontFamily: 'monospace',
      fontSize: 12,
      color: '#0f0',
      boxShadow: '0 0 20px rgba(37, 99, 235, 0.3)',
      zIndex: 9999,
      maxHeight: expanded ? '500px' : '50px',
      overflow: expanded ? 'auto' : 'hidden',
      transition: 'max-height 0.3s ease'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: expanded ? 12 : 0,
        paddingBottom: 8,
        borderBottom: expanded ? '1px solid #2563eb' : 'none'
      }}>
        <span style={{ fontWeight: 'bold', color: '#2563eb' }}>🧪 Test Suite</span>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#2563eb',
            cursor: 'pointer',
            fontSize: 16
          }}
        >
          {expanded ? '−' : '+'}
        </button>
      </div>

      {expanded && (
        <>
          {/* Current Test Status */}
          {testing && (
            <div style={{
              marginBottom: 12,
              padding: 8,
              background: 'rgba(37, 99, 235, 0.1)',
              borderRadius: 4,
              borderLeft: '3px solid #2563eb'
            }}>
              <div style={{ color: '#2563eb', marginBottom: 4 }}>⏳ {currentTest}</div>
              <div style={{
                width: '100%',
                height: 4,
                background: '#333',
                borderRadius: 2,
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  background: '#2563eb',
                  animation: 'pulse 1s infinite',
                  width: '50%'
                }} />
              </div>
            </div>
          )}

          {/* Test Results */}
          {testResults && (
            <div style={{
              marginBottom: 12,
              padding: 8,
              background: testResults.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              borderRadius: 4,
              borderLeft: `3px solid ${testResults.success ? '#10b981' : '#ef4444'}`
            }}>
              <div style={{
                color: testResults.success ? '#10b981' : '#ef4444',
                marginBottom: 4,
                fontWeight: 'bold'
              }}>
                {testResults.success ? '✅ PASSED' : '❌ FAILED'}
              </div>
              <div style={{ color: '#888', fontSize: 11 }}>
                {testResults.timestamp}
              </div>
              {testResults.error && (
                <div style={{ color: '#ef4444', marginTop: 4, fontSize: 11 }}>
                  Error: {testResults.error}
                </div>
              )}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleRunAllTests}
              disabled={testing}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: testing ? '#444' : '#2563eb',
                border: 'none',
                color: '#fff',
                borderRadius: 6,
                cursor: testing ? 'not-allowed' : 'pointer',
                fontSize: 11,
                fontWeight: 'bold',
                opacity: testing ? 0.5 : 1
              }}
            >
              Run All Tests
            </button>
            <button
              onClick={handleSimulateUpload}
              disabled={testing}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: testing ? '#444' : '#10b981',
                border: 'none',
                color: '#fff',
                borderRadius: 6,
                cursor: testing ? 'not-allowed' : 'pointer',
                fontSize: 11,
                fontWeight: 'bold',
                opacity: testing ? 0.5 : 1
              }}
            >
              Test Upload
            </button>
          </div>

          {/* Info */}
          <div style={{
            marginTop: 12,
            padding: 8,
            background: '#333',
            borderRadius: 4,
            fontSize: 11,
            color: '#888'
          }}>
            <p style={{ margin: '0 0 4px 0' }}>📌 Open DevTools (F12) to see detailed logs</p>
            <p style={{ margin: '0 0 4px 0' }}>🔍 Check Console tab for full test output</p>
            <p style={{ margin: 0 }}>⚠️ Upload test requires authentication</p>
          </div>
        </>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
