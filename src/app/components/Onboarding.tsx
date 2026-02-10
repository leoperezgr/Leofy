import { useNavigate } from 'react-router';
import { ArrowRight, TrendingUp, Shield, Sparkles } from 'lucide-react';

export function Onboarding() {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    localStorage.setItem('leofy_onboarded', 'true');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2DD4BF] via-[#14B8A6] to-[#0D9488] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm mb-6">
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
              <span className="text-4xl font-bold text-[#2DD4BF]">L</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">Welcome to Leofy</h1>
          <p className="text-white/90 text-lg">Your personal finance companion</p>
        </div>

        {/* Features */}
        <div className="space-y-4 mb-12">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Track Your Money Flow</h3>
                <p className="text-white/80 text-sm">See exactly where your money comes from and where it goes</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Manage Credit Cards</h3>
                <p className="text-white/80 text-sm">Keep track of multiple cards and stay within your limits</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Simple & Clear</h3>
                <p className="text-white/80 text-sm">No complexity, no stress—just clear financial insights</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={handleGetStarted}
          className="w-full bg-white text-[#2DD4BF] py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors shadow-lg"
        >
          Get Started
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
