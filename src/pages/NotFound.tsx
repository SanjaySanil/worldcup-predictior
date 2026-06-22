import { Link } from 'react-router-dom';
import { Trophy, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-pitch-900 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="font-display font-black text-[8rem] leading-none text-pitch-700 select-none">
          404
        </div>
        <h1 className="font-display text-3xl font-bold uppercase tracking-widest text-white mt-4">
          Page Not Found
        </h1>
        <p className="text-pitch-300 mt-3 max-w-sm mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 btn-gold rounded-sm mt-8 px-8 py-3.5 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Predictions
        </Link>
      </div>
    </div>
  );
}
