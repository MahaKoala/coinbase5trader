import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Key, Shield, Eye, EyeOff, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { testApiConnection } from "@/lib/coinbase-api";
import { SecureKeyManager } from "@/lib/secure-key-manager";

interface ApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApiKeySet: (keyName: string, privateKey: string, keyId?: string) => void;
}

export const ApiKeyDialog = ({ open, onOpenChange, onApiKeySet }: ApiKeyDialogProps) => {
  const [keyName, setKeyName] = useState("");
  const [keyId, setKeyId] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [hasStoredCredentials, setHasStoredCredentials] = useState(false);
  const { toast } = useToast();

  // Load existing credentials when dialog opens
  useEffect(() => {
    if (open) {
      const credentials = SecureKeyManager.getCredentials();
      if (credentials) {
        setKeyName(credentials.keyName);
        setKeyId(credentials.keyId || "");
        setPrivateKey(credentials.privateKey);
        setHasStoredCredentials(true);
      } else {
        setKeyName("");
        setKeyId("");
        setPrivateKey("");
        setHasStoredCredentials(false);
      }
    }
  }, [open]);

  const handleSave = () => {
    if (!keyName || !privateKey) {
      toast({
        title: "Missing Information",
        description: "Please fill in both API Key Name and Private Key fields.",
        variant: "destructive",
      });
      return;
    }

    // Validate credentials format
    const validation = SecureKeyManager.validateCredentials({ keyName, privateKey, keyId });
    if (!validation.isValid) {
      toast({
        title: "Invalid Credentials",
        description: validation.errors.join(". "),
        variant: "destructive",
      });
      return;
    }

    try {
      // Store credentials securely
      SecureKeyManager.storeCredentials({ keyName, privateKey, keyId: keyId || undefined });
      
      onApiKeySet(keyName, privateKey, keyId || undefined);
      onOpenChange(false);
      toast({
        title: "API Keys Secured",
        description: "Your Coinbase API keys are stored in session memory only.",
      });
    } catch (error) {
      toast({
        title: "Storage Failed",
        description: "Unable to securely store API credentials.",
        variant: "destructive",
      });
    }
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

    // Validate credentials format first
    const validation = SecureKeyManager.validateCredentials({ keyName, privateKey, keyId });
    if (!validation.isValid) {
      toast({
        title: "Invalid Credentials",
        description: validation.errors.join(". "),
        variant: "destructive",
      });
      return;
    }

    setIsTestingConnection(true);
    try {
      const result = await testApiConnection({ keyName, privateKey, keyId: keyId || undefined });
      
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

  const handleClearCredentials = () => {
    SecureKeyManager.clearCredentials();
    setKeyName("");
    setKeyId("");
    setPrivateKey("");
    setHasStoredCredentials(false);
    toast({
      title: "Credentials Cleared",
      description: "API credentials have been removed from session.",
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
            <Label htmlFor="key-id">Key ID (kid, optional)</Label>
            <Input
              id="key-id"
              type="text"
              placeholder="key-id"
              value={keyId}
              onChange={(e) => setKeyId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              If provided, used as JWT header <code>kid</code>. Otherwise, the Key Name is used.
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="private-key">Private Key (EC or PKCS#8)</Label>
            <div className="relative">
              <Textarea
                id="private-key"
                placeholder={"-----BEGIN EC PRIVATE KEY-----\nMHcCAQEE...\n-----END EC PRIVATE KEY-----\n\nOr\n\n-----BEGIN PRIVATE KEY-----\nMIGHAgEAMBM...\n-----END PRIVATE KEY-----"}
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                className="min-h-[120px] font-mono text-xs pr-10"
                type={showPrivateKey ? "text" : "password"}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-6 w-6 p-0"
                onClick={() => setShowPrivateKey(!showPrivateKey)}
              >
                {showPrivateKey ? (
                  <EyeOff className="h-3 w-3" />
                ) : (
                  <Eye className="h-3 w-3" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Paste your EC (SEC1) or PKCS#8 private key including the BEGIN/END lines. Both formats are supported.
            </p>
          </div>
          
          <div className="flex justify-between items-center pt-4">
            <div className="flex gap-2">
              {hasStoredCredentials && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleClearCredentials}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
            <div className="flex gap-2">
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
                {hasStoredCredentials ? "Update Keys" : "Save Keys"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
