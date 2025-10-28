import React, { useState } from 'react';
import {
  FadeIn,
  StaggerContainer,
  HoverScale,
  AnimatedSpinner,
  AnimatedProgressBar,
  Floating,
  Pulse,
  SlideIn,
  Typewriter,
  MorphingButton,
  Reveal,
  MagneticButton,
  GlitchText,
  ParticleSystem,
  LoadingSkeleton,
  TiltCard
} from './AdvancedAnimations';
import { ThemeSelector, ThemeEditor, useTheme } from './CustomThemes';

const AnimationShowcase = () => {
  const { theme } = useTheme();
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const handleProgressUpdate = () => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const handleLoading = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 3000);
  };

  return (
    <div className="min-h-screen bg-background text-text p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <FadeIn direction="down" delay={0.2}>
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">
              <GlitchText intensity={0.05}>
                Animation & Theme Showcase
              </GlitchText>
            </h1>
            <p className="text-text-secondary text-lg">
              Explore advanced animations and custom themes
            </p>
          </div>
        </FadeIn>

        {/* Theme Controls */}
        <FadeIn delay={0.4}>
          <div className="flex justify-center space-x-4 mb-8">
            <ThemeSelector />
            <ThemeEditor />
          </div>
        </FadeIn>

        {/* Animation Grid */}
        <StaggerContainer staggerDelay={0.1}>
          {/* Fade In Examples */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FadeIn direction="up" delay={0.1}>
              <TiltCard className="bg-surface border border-border rounded-lg p-6 shadow-md">
                <h3 className="text-xl font-semibold mb-4 text-primary">Fade In Animation</h3>
                <p className="text-text-secondary mb-4">
                  Smooth fade in with directional movement
                </p>
                <div className="space-y-2">
                  <FadeIn direction="left" delay={0.2}>
                    <div className="bg-primary text-white p-2 rounded text-sm">Left</div>
                  </FadeIn>
                  <FadeIn direction="right" delay={0.3}>
                    <div className="bg-secondary text-white p-2 rounded text-sm">Right</div>
                  </FadeIn>
                  <FadeIn direction="up" delay={0.4}>
                    <div className="bg-accent text-white p-2 rounded text-sm">Up</div>
                  </FadeIn>
                </div>
              </TiltCard>
            </FadeIn>

            {/* Hover Effects */}
            <FadeIn direction="up" delay={0.2}>
              <div className="bg-surface border border-border rounded-lg p-6 shadow-md">
                <h3 className="text-xl font-semibold mb-4 text-primary">Hover Effects</h3>
                <p className="text-text-secondary mb-4">
                  Interactive hover animations
                </p>
                <div className="space-y-3">
                  <HoverScale scale={1.05}>
                    <button className="w-full bg-primary text-white p-3 rounded-lg transition-colors hover:bg-opacity-80">
                      Hover Scale
                    </button>
                  </HoverScale>
                  <MagneticButton strength={0.3}>
                    <button className="w-full bg-secondary text-white p-3 rounded-lg transition-colors hover:bg-opacity-80">
                      Magnetic Effect
                    </button>
                  </MagneticButton>
                </div>
              </div>
            </FadeIn>

            {/* Loading Animations */}
            <FadeIn direction="up" delay={0.3}>
              <div className="bg-surface border border-border rounded-lg p-6 shadow-md">
                <h3 className="text-xl font-semibold mb-4 text-primary">Loading Animations</h3>
                <p className="text-text-secondary mb-4">
                  Various loading states
                </p>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <AnimatedSpinner size={24} color={theme.colors.primary} />
                    <span className="text-sm">Loading...</span>
                  </div>
                  <AnimatedProgressBar 
                    progress={progress} 
                    color={theme.colors.primary}
                    duration={0.5}
                  />
                  <button 
                    onClick={handleProgressUpdate}
                    className="w-full bg-accent text-white p-2 rounded text-sm hover:bg-opacity-80 transition-colors"
                  >
                    Update Progress
                  </button>
                </div>
              </div>
            </FadeIn>

            {/* Floating & Pulse */}
            <FadeIn direction="up" delay={0.4}>
              <div className="bg-surface border border-border rounded-lg p-6 shadow-md">
                <h3 className="text-xl font-semibold mb-4 text-primary">Floating & Pulse</h3>
                <p className="text-text-secondary mb-4">
                  Continuous animations
                </p>
                <div className="space-y-4">
                  <Floating intensity={10}>
                    <div className="bg-primary text-white p-4 rounded-lg text-center">
                      Floating Element
                    </div>
                  </Floating>
                  <Pulse scale={1.05}>
                    <div className="bg-accent text-white p-4 rounded-lg text-center">
                      Pulsing Element
                    </div>
                  </Pulse>
                </div>
              </div>
            </FadeIn>

            {/* Typewriter Effect */}
            <FadeIn direction="up" delay={0.5}>
              <div className="bg-surface border border-border rounded-lg p-6 shadow-md">
                <h3 className="text-xl font-semibold mb-4 text-primary">Typewriter Effect</h3>
                <p className="text-text-secondary mb-4">
                  Text animation
                </p>
                <div className="bg-background border border-border rounded p-4 min-h-[60px]">
                  <Typewriter 
                    text="Hello! This is a typewriter effect. It types out text character by character."
                    speed={50}
                  />
                </div>
              </div>
            </FadeIn>

            {/* Morphing Button */}
            <FadeIn direction="up" delay={0.6}>
              <div className="bg-surface border border-border rounded-lg p-6 shadow-md">
                <h3 className="text-xl font-semibold mb-4 text-primary">Morphing Button</h3>
                <p className="text-text-secondary mb-4">
                  Button state transitions
                </p>
                <MorphingButton
                  morphTo="✓ Saved"
                  className="w-full bg-success text-white p-3 rounded-lg"
                >
                  Save Changes
                </MorphingButton>
              </div>
            </FadeIn>
          </div>

          {/* Slide In Examples */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <SlideIn direction="left">
              <div className="bg-surface border border-border rounded-lg p-6 shadow-md">
                <h3 className="text-xl font-semibold mb-4 text-primary">Slide In from Left</h3>
                <p className="text-text-secondary">
                  This content slides in from the left side of the screen when it comes into view.
                </p>
              </div>
            </SlideIn>

            <SlideIn direction="right">
              <div className="bg-surface border border-border rounded-lg p-6 shadow-md">
                <h3 className="text-xl font-semibold mb-4 text-primary">Slide In from Right</h3>
                <p className="text-text-secondary">
                  This content slides in from the right side of the screen when it comes into view.
                </p>
              </div>
            </SlideIn>
          </div>

          {/* Reveal Examples */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <Reveal direction="up" delay={0.1}>
              <div className="bg-surface border border-border rounded-lg p-6 shadow-md">
                <h3 className="text-xl font-semibold mb-4 text-primary">Reveal Up</h3>
                <p className="text-text-secondary">
                  Content reveals with scale and movement
                </p>
              </div>
            </Reveal>

            <Reveal direction="left" delay={0.2}>
              <div className="bg-surface border border-border rounded-lg p-6 shadow-md">
                <h3 className="text-xl font-semibold mb-4 text-primary">Reveal Left</h3>
                <p className="text-text-secondary">
                  Content reveals with scale and movement
                </p>
              </div>
            </Reveal>

            <Reveal direction="right" delay={0.3}>
              <div className="bg-surface border border-border rounded-lg p-6 shadow-md">
                <h3 className="text-xl font-semibold mb-4 text-primary">Reveal Right</h3>
                <p className="text-text-secondary">
                  Content reveals with scale and movement
                </p>
              </div>
            </Reveal>
          </div>

          {/* Loading States */}
          <div className="mt-8">
            <h3 className="text-2xl font-semibold mb-6 text-primary">Loading States</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-surface border border-border rounded-lg p-6 shadow-md">
                <h4 className="text-lg font-semibold mb-4">Skeleton Loading</h4>
                <div className="space-y-3">
                  <LoadingSkeleton width="100%" height="20px" />
                  <LoadingSkeleton width="80%" height="20px" />
                  <LoadingSkeleton width="60%" height="20px" />
                </div>
              </div>

              <div className="bg-surface border border-border rounded-lg p-6 shadow-md">
                <h4 className="text-lg font-semibold mb-4">Interactive Loading</h4>
                <button 
                  onClick={handleLoading}
                  className="w-full bg-primary text-white p-3 rounded-lg hover:bg-opacity-80 transition-colors mb-4"
                >
                  {isLoading ? 'Loading...' : 'Start Loading'}
                </button>
                {isLoading && (
                  <div className="flex items-center justify-center space-x-3">
                    <AnimatedSpinner size={32} color={theme.colors.primary} />
                    <span>Processing...</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Particle System */}
          <div className="mt-8 relative">
            <div className="bg-surface border border-border rounded-lg p-6 shadow-md relative overflow-hidden">
              <h3 className="text-xl font-semibold mb-4 text-primary">Particle System</h3>
              <p className="text-text-secondary mb-4">
                Animated particles in the background
              </p>
              <ParticleSystem count={30} color={theme.colors.primary} />
              <div className="relative z-10">
                <button className="bg-primary text-white p-3 rounded-lg hover:bg-opacity-80 transition-colors">
                  Interactive Button
                </button>
              </div>
            </div>
          </div>

          {/* Theme Preview */}
          <div className="mt-8">
            <h3 className="text-2xl font-semibold mb-6 text-primary">Current Theme Colors</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Object.entries(theme.colors).map(([key, value]) => (
                <FadeIn key={key} delay={Math.random() * 0.5}>
                  <div className="text-center">
                    <div 
                      className="w-16 h-16 rounded-lg mx-auto mb-2 border border-border"
                      style={{ backgroundColor: value }}
                    />
                    <p className="text-xs text-text-secondary capitalize">{key}</p>
                    <p className="text-xs text-text-secondary font-mono">{value}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </StaggerContainer>
      </div>
    </div>
  );
};

export default AnimationShowcase;
