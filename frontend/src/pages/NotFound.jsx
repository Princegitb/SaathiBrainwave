import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Compass, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center text-center py-20 px-6"
    >
      <div className="w-20 h-20 rounded-3xl bg-surface-soft flex items-center justify-center mb-5">
        <Compass size={36} className="text-primary" />
      </div>
      <h1 className="text-h1 mb-2">We can't find that page</h1>
      <p className="text-body max-w-md mb-6">
        The page you're looking for might have moved or never existed. Let's get you
        back to your practice.
      </p>
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-2xl font-medium hover:bg-primary-dark transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Dashboard
      </button>
    </motion.div>
  );
}