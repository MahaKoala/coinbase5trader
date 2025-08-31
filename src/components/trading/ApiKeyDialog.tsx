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
  onApiKeySet: (keyName: string, privateKey: string) => void;
}

export const ApiKeyDialog = ({ open, onOpenChange, onApiKeySet }: ApiKeyDialogProps) => {
  const [keyName, setKeyName] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const { toast } = useToast();

  const handleSave = () => {
    if (!keyName || !privateKey) {
      toast({
        title: "Missing Information",
        description: "Please fill in both API Key Name and Private Key fields.",
        variant: "destructive",
      });
      return;
    }

    onApiKeySet(keyName, privateKey);
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
              Uses JWT ECDSA authentication. Your keys are stored securely and only used for trading operations.
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="key-name">API Key Name</Label>
            <Input
              id="key-name"
              type="text"
              placeholder="organizations/your-key-name/apiKeys/key-id"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="private-key">Private Key (PKCS#8 format)</Label>
            <Textarea
              id="private-key"
              placeholder="-----BEGIN PRIVATE KEY-----&#10;MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg...&#10;...&#10;-----END PRIVATE KEY-----"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              className="min-h-[120px] font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Copy and paste your PKCS#8 private key including the BEGIN/END lines
            </p>
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