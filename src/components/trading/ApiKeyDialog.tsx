import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Key, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { testApiConnection } from "@/lib/coinbase-api";

interface ApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApiKeySet: (keyName: string, privateKey: string) => void;
}

export const ApiKeyDialog = ({ open, onOpenChange, onApiKeySet }: ApiKeyDialogProps) => {
  const [keyName, setKeyName] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [isTestingConnection, setIsTestingConnection] = useState(false);
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

  const handleTestConnection = async () => {
    if (!keyName || !privateKey) {
      toast({
        title: "Missing Information",
        description: "Please fill in both API Key Name and Private Key fields first.",
        variant: "destructive",
      });
      return;
    }

    setIsTestingConnection(true);
    try {
      const result = await testApiConnection({ keyName, privateKey });
      
      if (result.success) {
        toast({
          title: "Connection Successful",
          description: "Your API credentials are working correctly.",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Connection Test Failed",
        description: "Unable to test connection. Please check your credentials.",
        variant: "destructive",
      });
    } finally {
      setIsTestingConnection(false);
    }
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
            <Label htmlFor="private-key">Private Key (EC or PKCS#8 format)</Label>
            <Textarea
              id="private-key"
              placeholder="-----BEGIN EC PRIVATE KEY-----&#10;MHcCAQEEIE...&#10;-----END EC PRIVATE KEY-----&#10;&#10;or&#10;&#10;-----BEGIN PRIVATE KEY-----&#10;MIGHAgEAMBM...&#10;-----END PRIVATE KEY-----"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              className="min-h-[120px] font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Copy and paste your private key including the BEGIN/END lines (supports both EC and PKCS#8 formats)
            </p>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              variant="secondary" 
              onClick={handleTestConnection}
              disabled={isTestingConnection || !keyName || !privateKey}
            >
              {isTestingConnection ? "Testing..." : "Test Connection"}
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