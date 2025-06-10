import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Coins, Gift, Trophy, DollarSign } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'ad' | 'task' | 'daily' | 'exchange' | 'quest';
  reward?: number;
  taskName?: string;
  onContinue: () => void;
  continueButtonText?: string;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  type = "task",
  reward = 0,
  taskName = "",
  onContinue,
}: ConfirmationModalProps) {
  const handleContinue = () => {
    if (onContinue) {
      onContinue();
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {type === "ad" ? "🎉 Ad Watched!" : 
             type === "daily" ? "🎉 Daily Reward!" : 
             "🎉 Task Completed!"}
          </DialogTitle>
        </DialogHeader>

        <div className="text-center py-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Congratulations!
          </h3>

          <p className="text-gray-600 mb-4">
            {type === "ad" 
              ? `You've earned +${reward} points for watching the ad!`
              : type === "daily"
              ? `You've earned +${reward} points as your daily reward!`
              : `You've earned +${reward} points for completing "${taskName}"!`}
          </p>

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-600">+{reward}</div>
            <div className="text-sm text-green-700">Points Added</div>
          </div>
        </div>

        <DialogFooter className="sm:justify-center">
          <Button
            onClick={handleContinue}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90"
          >
            {type === "ad" ? "Continue" : "Great!"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}