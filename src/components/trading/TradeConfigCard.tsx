import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { TrendingUp, Target, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TradeConfig {
  crypto: string;
  amount: string;
  takeProfitPercent: string;
  enableTrailing: boolean;
  trailingPercent: string;
}

interface TradeConfigCardProps {
  onCreateTrade: (config: TradeConfig) => void;
  disabled: boolean;
}

const POPULAR_CRYPTOS = [
  { id: "BTC-USD", name: "Bitcoin", symbol: "BTC" },
  { id: "ETH-USD", name: "Ethereum", symbol: "ETH" },
  { id: "SOL-USD", name: "Solana", symbol: "SOL" },
  { id: "ADA-USD", name: "Cardano", symbol: "ADA" },
  { id: "MATIC-USD", name: "Polygon", symbol: "MATIC" },
  { id: "AVAX-USD", name: "Avalanche", symbol: "AVAX" },
];

export const TradeConfigCard = ({ onCreateTrade, disabled }: TradeConfigCardProps) => {
  const [config, setConfig] = useState<TradeConfig>({
    crypto: "",
    amount: "",
    takeProfitPercent: "5",
    enableTrailing: false,
    trailingPercent: "2",
  });
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!config.crypto || !config.amount || !config.takeProfitPercent) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (parseFloat(config.amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0.",
        variant: "destructive",
      });
      return;
    }

    onCreateTrade(config);
  };

  return (
    <Card className="bg-gradient-dark border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Configure Trade
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="crypto">Cryptocurrency</Label>
            <Select
              value={config.crypto}
              onValueChange={(value) => setConfig({ ...config, crypto: value })}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select cryptocurrency" />
              </SelectTrigger>
              <SelectContent>
                {POPULAR_CRYPTOS.map((crypto) => (
                  <SelectItem key={crypto.id} value={crypto.id}>
                    {crypto.symbol} - {crypto.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (USD)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="100"
              value={config.amount}
              onChange={(e) => setConfig({ ...config, amount: e.target.value })}
              disabled={disabled}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="take-profit" className="flex items-center gap-2">
              <Target className="h-4 w-4 text-success" />
              Take Profit (%)
            </Label>
            <Input
              id="take-profit"
              type="number"
              placeholder="5"
              value={config.takeProfitPercent}
              onChange={(e) => setConfig({ ...config, takeProfitPercent: e.target.value })}
              disabled={disabled}
            />
          </div>

          {config.enableTrailing && (
            <div className="space-y-2">
              <Label htmlFor="trailing" className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Trailing Stop (%)
              </Label>
              <Input
                id="trailing"
                type="number"
                placeholder="2"
                value={config.trailingPercent}
                onChange={(e) => setConfig({ ...config, trailingPercent: e.target.value })}
                disabled={disabled}
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="space-y-1">
            <Label htmlFor="trailing-toggle">Enable Trailing Take-Profit</Label>
            <p className="text-sm text-muted-foreground">
              Automatically adjust take-profit as price moves favorably
            </p>
          </div>
          <Switch
            id="trailing-toggle"
            checked={config.enableTrailing}
            onCheckedChange={(checked) => setConfig({ ...config, enableTrailing: checked })}
            disabled={disabled}
          />
        </div>

        <Button 
          onClick={handleSubmit} 
          className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300"
          disabled={disabled}
          size="lg"
        >
          {disabled ? "Connect API to Start Trading" : "Create Trade Order"}
        </Button>
      </CardContent>
    </Card>
  );
};