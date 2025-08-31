import { Key, Settings, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  onSettingsClick: () => void;
  isApiConnected: boolean;
}

export const Header = ({ onSettingsClick, isApiConnected }: HeaderProps) => {
  return (
    <header className="border-b border-border bg-card">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-bold">Coinbase Advanced Trading</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Key className={`h-4 w-4 ${isApiConnected ? 'text-success' : 'text-muted-foreground'}`} />
            <span className={`text-sm ${isApiConnected ? 'text-success' : 'text-muted-foreground'}`}>
              API {isApiConnected ? 'Connected' : 'Not Connected'}
            </span>
          </div>
          
          <Button variant="outline" size="sm" onClick={onSettingsClick}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>
    </header>
  );
};