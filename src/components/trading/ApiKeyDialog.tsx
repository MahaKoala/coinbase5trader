import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Key, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApiKeySet: (apiKey: string, secretKey: string, passphrase: string) => void;
}

export const ApiKeyDialog = ({ open, onOpenChange, onApiKeySet }: ApiKeyDialogProps) => {
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const { toast } = useToast();

  const handleSave = () => {
    if (!apiKey || !secretKey || !passphrase) {
      toast({
        title: "Missing Information",
        description: "Please fill in all API key fields.",
        variant: "destructive",
      });
      return;
    }

    onApiKeySet(apiKey, secretKey, passphrase);
    onOpenChange(false);
    toast({
      title: "API Keys Configured",
      description: "Your Coinbase API keys have been securely stored.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            Configure Coinbase API Keys
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <Shield className="h-4 w-4 text-primary" />
            <p className="text-sm text-muted-foreground">
              Your API keys are stored securely and only used for trading operations.
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <Input
              id="api-key"
              type="text"
              placeholder="Enter your Coinbase API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="secret-key">Secret Key</Label>
            <Textarea
              id="secret-key"
              placeholder="Enter your Coinbase secret key"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="passphrase">Passphrase</Label>
            <Input
              id="passphrase"
              type="password"
              placeholder="Enter your passphrase"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-gradient-primary">
              Save API Keys
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};