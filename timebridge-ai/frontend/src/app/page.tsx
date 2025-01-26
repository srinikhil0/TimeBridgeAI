'use client';

import Image from "next/image";
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const features = [
  { icon: '🤖', title: 'AI-Powered Calendar Management', description: 'Intelligent scheduling through natural conversation' },
  { icon: '📅', title: 'Automated Event Creation', description: 'Effortlessly create and manage calendar events' },
  { icon: '📚', title: 'Smart Study Schedule Planning', description: 'Optimize your study time with AI-generated schedules' },
  { icon: '🔔', title: 'Intelligent Reminder System', description: 'Never miss important events with smart reminders' },
  { icon: '🎯', title: 'Meeting Coordination', description: 'Seamlessly coordinate meetings with multiple participants' },
  { icon: '🎂', title: 'Birthday and Special Event Tracking', description: 'Keep track of important dates and celebrations' },
];

export default function Home() {
  const { signInWithGoogle, loading, error, user, clearError } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/chat');
    }
  }, [user, router]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  return (
    <div className="min-h-screen bg-gray-900 overflow-hidden relative">
      {/* Background gradient circles */}
      <div className="fixed top-[-250px] left-[-200px] w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] -z-10 pointer-events-none" />
      <div className="fixed bottom-[-250px] right-[-200px] w-[600px] h-[600px] rounded-full bg-secondary/5 blur-[120px] -z-10 pointer-events-none" />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        {/* Hero Section */}
        <div className="text-center mb-20 space-y-8">
          <h1 className="text-6xl sm:text-8xl font-bold gradient-text tracking-tight mb-6">
            TimeBridgeAI
          </h1>
          <p className="text-xl sm:text-2xl text-gray-300/90 mb-12 max-w-2xl mx-auto">
            Your intelligent calendar assistant that understands natural conversation
          </p>
          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="glass-effect inline-flex items-center gap-3 px-8 py-4 rounded-2xl
                     text-white font-medium transition-all duration-300 
                     hover:bg-white/10 hover:scale-105 hover:shadow-lg hover:shadow-primary/20
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <LoadingSpinner />
            ) : (
              <>
                <Image 
                  src="/google-icon.svg" 
                  alt="Google" 
                  width={24} 
                  height={24}
                  className="invert"
                />
                Continue with Google
              </>
            )}
          </button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-24">
          {features.map((feature, index) => (
            <div
              key={index}
              className="glass-effect p-8 rounded-2xl 
                       hover:bg-white/5 transition-all duration-300 
                       hover:scale-105 hover:shadow-lg hover:shadow-primary/10"
            >
              <div className="text-4xl mb-6">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-white/90 mb-4">
                {feature.title}
              </h3>
              <p className="text-gray-400/80">{feature.description}</p>
            </div>
          ))}
        </div>
                {/* GPT Extension Info */}
                <div className="mt-32 text-center">
          <div className="glass-effect max-w-3xl mx-auto p-8 rounded-2xl">
            <h2 className="text-2xl font-semibold mb-4 text-white/90">
              What is TimeBridgeAI?
            </h2>
            <p className="text-gray-400/80 text-lg">
              TimeBridgeAI is an extension that enhances existing GPT models with calendar management capabilities, 
              allowing AI assistants to seamlessly create and manage calendar events through natural conversation.
            </p>
            <div className="mt-6 flex justify-center gap-4">
              <span className="glass-effect px-4 py-2 rounded-xl text-sm text-white/70">
                GPT Integration
              </span>
              <span className="glass-effect px-4 py-2 rounded-xl text-sm text-white/70">
                Calendar API
              </span>
              <span className="glass-effect px-4 py-2 rounded-xl text-sm text-white/70">
                Natural Language Processing
              </span>
            </div>
          </div>
        </div>
      </main>
      {error && (
        <div className="mt-4 text-red-500 animate-fade-in">
          {error}
        </div>
      )}
    </div>
  );
}