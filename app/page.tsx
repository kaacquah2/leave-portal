'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Landing from '@/components/landing'
import LoginForm from '@/components/login-form'
import Portal from '@/components/portal'

import { UserRole } from '@/lib/permissions'
import { mapToMoFARole } from '@/lib/role-mapping'

function PortalWrapper({ userRole, onLogout, staffId }: { userRole: UserRole, onLogout: () => void, staffId?: string }) {
  const moFARole = mapToMoFARole(userRole)
  return <Portal userRole={moFARole} onLogout={onLogout} staffId={staffId} />
}

export default function Page() {
  const router = useRouter()
  const [stage, setStage] = useState<'landing' | 'login' | 'portal' | 'checking'>('checking')
  const [userRole, setUserRole] = useState<UserRole>('EMPLOYEE')
  const [staffId, setStaffId] = useState<string | undefined>(undefined)
  const [mounted, setMounted] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('Initializing application...')
  const [apiBaseUrl, setApiBaseUrl] = useState<string>('')

  // Set mounted state and update loading message after mount to prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
    
    // Update loading message based on environment (only after mount)
    const isElectron = typeof window !== 'undefined' && ((window as any).electronAPI || (window as any).__ELECTRON_API_URL__ !== undefined);
    const apiUrl = typeof window !== 'undefined' ? ((window as any).__ELECTRON_API_URL__ || (window as any).electronAPI?.apiUrl || '') : '';
    const isRemote = typeof window !== 'undefined' && (window.location.protocol === 'https:' || (apiUrl && apiUrl.startsWith('http')));
    
    if (isRemote) {
      setLoadingMessage('Connecting to server...')
    } else if (isElectron) {
      setLoadingMessage('Initializing application...')
    } else {
      setLoadingMessage('Initializing application...')
    }
    
    if (apiUrl) {
      setApiBaseUrl(apiUrl)
    }
  }, [])

  // Check if user is already logged in on page load/reload
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if we're in Electron and have API URL configured
        const isElectron = typeof window !== 'undefined' && ((window as any).electronAPI || (window as any).__ELECTRON_API_URL__ !== undefined);
        const apiBaseUrl = (window as any).__ELECTRON_API_URL__ || (window as any).electronAPI?.apiUrl || '';
        
        // Log connection info for debugging
        if (isElectron) {
          console.log('[App] Running in Electron');
          console.log('[App] API Base URL:', apiBaseUrl || 'Not configured (will use current origin)');
          console.log('[App] Current location:', window.location.href);
        }
        
        // If in Electron loading from file:// without API URL, show error
        if (isElectron && !apiBaseUrl && window.location.protocol === 'file:') {
          console.error('[App] Electron app detected but no API URL configured and loading from file://');
          console.error('[App] This build may not have been configured correctly.');
          setStage('landing'); // Show landing page which will show login form
          return;
        }
        
        // Build API URL - use apiBaseUrl if available, otherwise use relative URL
        // If we're loading from HTTPS in Electron, the API URL should be the same origin
        let apiUrl: string;
        if (apiBaseUrl && apiBaseUrl.trim() !== '') {
          // Ensure the API URL has a protocol
          let normalizedApiUrl = apiBaseUrl.trim();
          if (!normalizedApiUrl.startsWith('http://') && !normalizedApiUrl.startsWith('https://')) {
            // Add https:// if no protocol is specified
            normalizedApiUrl = `https://${normalizedApiUrl}`;
            console.log('[App] Added https:// protocol to API URL:', normalizedApiUrl);
          }
          // Remove trailing slash if present
          normalizedApiUrl = normalizedApiUrl.replace(/\/$/, '');
          apiUrl = `${normalizedApiUrl}/api/auth/me`;
        } else if (isElectron && window.location.protocol === 'https:') {
          // In Electron loading from remote, use current origin
          apiUrl = `${window.location.origin}/api/auth/me`;
        } else {
          // Development or same-origin
          apiUrl = '/api/auth/me';
        }
        
        console.log('[App] Checking authentication at:', apiUrl);
        
        const controller = new AbortController();
        // Increase timeout for remote connections (10 seconds)
        const timeout = isElectron && window.location.protocol === 'https:' ? 10000 : 5000;
        const timeoutId = setTimeout(() => {
          // Abort the request if it takes too long
          controller.abort();
        }, timeout);
        
        let response: Response;
        try {
          response = await fetch(apiUrl, {
            credentials: 'include',
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
            },
          });
        } finally {
          // Always clear timeout to prevent memory leaks
          clearTimeout(timeoutId);
        }

        if (response.ok) {
          const user = await response.json()
          const role = user.role as UserRole
          
          console.log('[App] Authentication successful, role:', role);
          
          // Redirect to role-specific page if on root
          if ((role === 'hr' || role === 'hr_assistant') && window.location.pathname === '/') {
            router.push('/hr')
            return
          } else if ((role === 'manager' || role === 'deputy_director') && window.location.pathname === '/') {
            router.push('/manager')
            return
          } else if (role === 'admin' && window.location.pathname === '/') {
            router.push('/admin')
            return
          } else if (role === 'employee' && window.location.pathname === '/') {
            router.push('/employee')
            return
          }
          
          // If already on a role-specific page or staying on root, restore session
          // Map admin to SYSTEM_ADMIN for consistency
          const mappedRole = role === 'admin' || role === 'SYS_ADMIN' ? 'SYSTEM_ADMIN' : role
          setUserRole(mappedRole as UserRole)
          if (user.staffId) setStaffId(user.staffId)
          setStage('portal')
        } else {
          // No auth found, show landing page
          if (response.status === 401) {
            console.log('[App] User not authenticated (401) - showing landing page');
            if (process.env.NODE_ENV === 'development' || (window as any).__DEBUG_AUTH__) {
              console.log('[App] Debug: To enable detailed auth logging, set DEBUG_AUTH=true in Vercel environment variables');
            }
          } else {
            console.warn('[App] Authentication check failed with status:', response.status);
          }
          setStage('landing')
        }
      } catch (error: any) {
        // Error fetching user, show landing page
        // Handle AbortError silently (it's expected when timeout occurs)
        if (error.name === 'AbortError' || error.message === 'Request timeout - API server may not be reachable') {
          // If we're loading from a remote URL and it times out, the page might still be loading
          // Don't immediately show landing page, wait a bit more for remote connections
          const isElectron = typeof window !== 'undefined' && ((window as any).electronAPI || (window as any).__ELECTRON_API_URL__ !== undefined);
          const apiBaseUrl = (window as any).__ELECTRON_API_URL__ || (window as any).electronAPI?.apiUrl || '';
          
          if ((apiBaseUrl || window.location.protocol === 'https:') && isElectron) {
            console.log('[App] Remote connection timeout, waiting a bit longer...');
            // Wait a bit longer for the page to fully load
            setTimeout(() => {
              setStage('landing');
            }, 3000);
            return;
          }
          
          // For non-remote connections, just show landing page
          console.log('[App] Auth check timeout - showing landing page');
          setStage('landing');
          return;
        }
        
        // Log other errors with detailed diagnostics
        console.error('[App] Auth check failed:', error);
        
        // Provide more specific error information
        const errorMessage = error.message || error.toString() || 'Unknown error';
        const isElectron = typeof window !== 'undefined' && ((window as any).electronAPI || (window as any).__ELECTRON_API_URL__ !== undefined);
        const apiBaseUrl = (window as any).__ELECTRON_API_URL__ || (window as any).electronAPI?.apiUrl || '';
        
        // Reconstruct the API URL for error logging (same logic as in try block)
        let attemptedUrl: string;
        if (apiBaseUrl && apiBaseUrl.trim() !== '') {
          let normalizedApiUrl = apiBaseUrl.trim();
          if (!normalizedApiUrl.startsWith('http://') && !normalizedApiUrl.startsWith('https://')) {
            normalizedApiUrl = `https://${normalizedApiUrl}`;
          }
          normalizedApiUrl = normalizedApiUrl.replace(/\/$/, '');
          attemptedUrl = `${normalizedApiUrl}/api/auth/me`;
        } else if (isElectron && window.location.protocol === 'https:') {
          attemptedUrl = `${window.location.origin}/api/auth/me`;
        } else {
          attemptedUrl = '/api/auth/me';
        }
        
        if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
          console.error('[App] Network/CORS error detected');
          console.error('[App] Error details:', {
            message: errorMessage,
            name: error.name,
            isElectron,
            apiBaseUrl: apiBaseUrl || 'using relative URL',
            currentOrigin: window.location.origin,
            protocol: window.location.protocol,
            attemptedUrl: attemptedUrl,
          });
          
          // Check if it might be a CORS issue
          if (isElectron && (window.location.protocol === 'file:' || window.location.protocol === 'app:')) {
            console.warn('[App] ⚠️  Possible CORS issue: Electron app with file:// or app:// protocol');
            console.warn('[App] 💡 Make sure CORS headers are properly configured on the server');
            console.warn('[App] 💡 The server should allow the API origin with credentials');
          } else if (apiBaseUrl && apiBaseUrl !== window.location.origin) {
            console.warn('[App] ⚠️  Cross-origin request detected');
            console.warn('[App] 💡 Make sure CORS is properly configured for:', apiBaseUrl);
          }
          
          // Check if it might be a network connectivity issue
          if (!navigator.onLine) {
            console.error('[App] ❌ Browser reports offline - no internet connection');
          } else {
            console.warn('[App] ⚠️  Browser reports online, but request failed');
            console.warn('[App] 💡 Possible causes:');
            console.warn('[App]    - Server is unreachable or down');
            console.warn('[App]    - CORS configuration issue');
            console.warn('[App]    - SSL/TLS certificate problem');
            console.warn('[App]    - Firewall or network restrictions');
          }
        } else {
          console.error('[App] Unexpected error:', errorMessage);
        }
        
        // Show landing page after error handling
        setStage('landing')
      }
    }

    checkAuth()
  }, [router])

  const handleSignIn = () => {
    setStage('login')
  }

  const handleLoginSuccess = (role: UserRole, id?: string) => {
    // Map admin to SYSTEM_ADMIN for consistency
    const mappedRole = role === 'admin' || role === 'SYS_ADMIN' ? 'SYSTEM_ADMIN' : role
    setUserRole(mappedRole as UserRole)
    if (id) setStaffId(id)
    setStage('portal')
    
    // Redirect to role-specific page after login
    if (role === 'hr') {
      router.push('/hr')
    } else if (role === 'manager') {
      router.push('/manager')
    } else if (role === 'admin') {
      router.push('/admin')
    } else if (role === 'employee') {
      router.push('/employee')
    }
  }

  const handleLogout = async () => {
    try {
      // Get API base URL for logout
      const apiBaseUrl = (window as any).__ELECTRON_API_URL__ || (window as any).electronAPI?.apiUrl || '';
      const isElectron = typeof window !== 'undefined' && ((window as any).electronAPI || (window as any).__ELECTRON_API_URL__ !== undefined);
      
      let logoutUrl: string;
      if (apiBaseUrl && apiBaseUrl.trim() !== '') {
        logoutUrl = `${apiBaseUrl}/api/auth/logout`;
      } else if (isElectron && window.location.protocol === 'https:') {
        logoutUrl = `${window.location.origin}/api/auth/logout`;
      } else {
        logoutUrl = '/api/auth/logout';
      }
      
      // Call logout API to clear cookie
      await fetch(logoutUrl, {
        method: 'POST',
        credentials: 'include',
      })
    } catch (error) {
      console.error('[App] Logout error:', error);
    } finally {
      setStage('landing')
      setUserRole('hr')
      setStaffId(undefined)
    }
  }

  // Show loading while checking authentication
  if (stage === 'checking') {
    // Only show environment-specific content after mount to prevent hydration mismatch
    const isElectron = mounted && typeof window !== 'undefined' && ((window as any).electronAPI || (window as any).__ELECTRON_API_URL__ !== undefined);
    const showApiUrl = mounted && isElectron && apiBaseUrl;
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center flex-col">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
        <div className="text-muted-foreground text-lg">Loading HR Leave Portal...</div>
        <div className="text-sm text-muted-foreground mt-2">
          {loadingMessage}
        </div>
        {showApiUrl && (
          <div className="text-xs text-muted-foreground mt-1 opacity-70">
            API: {apiBaseUrl}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {stage === 'landing' && <Landing onSignIn={handleSignIn} />}
      {stage === 'login' && <LoginForm onLoginSuccess={handleLoginSuccess} onBack={() => setStage('landing')} />}
      {stage === 'portal' && (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
          <PortalWrapper userRole={userRole} onLogout={handleLogout} staffId={staffId} />
        </Suspense>
      )}
    </div>
  )
}
