import { Key, Settings, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SecureKeyManager } from "@/lib/secure-key-manager";

interface HeaderProps {
  onSettingsClick: () => void;
  isApiConnected: boolean;
}

export const Header = ({ onSettingsClick, isApiConnected }: HeaderProps) => {
  // Get masked key name for display
  const credentials = SecureKeyManager.getCredentials();
  const maskedKeyName = SecureKeyManager.getMaskedKeyName(credentials);

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
            <div className="flex flex-col">
              <span className={`text-sm ${isApiConnected ? 'text-success' : 'text-muted-foreground'}`}>
                API {isApiConnected ? 'Connected' : 'Not Connected'}
              </span>
              {isApiConnected && (
                <span className="text-xs text-muted-foreground font-mono">
                  {maskedKeyName}
                </span>
              )}
            </div>
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