import { useState } from "react";
import { Header } from "@/components/trading/Header";
import { ApiKeyDialog } from "@/components/trading/ApiKeyDialog";
import { TradeConfigCard } from "@/components/trading/TradeConfigCard";
import { ActiveTradesCard } from "@/components/trading/ActiveTradesCard";
import { useToast } from "@/hooks/use-toast";

interface Trade {
  id: string;
  crypto: string;
  amount: number;
  entryPrice: number;
  currentPrice: number;
  takeProfitPercent: number;
  trailingEnabled: boolean;
  status: 'active' | 'filled' | 'cancelled';
  timestamp: Date;
}

interface TradeConfig {
  crypto: string;
  amount: string;
  takeProfitPercent: string;
  enableTrailing: boolean;
  trailingPercent: string;
}

const Index = () => {
  const [isApiDialogOpen, setIsApiDialogOpen] = useState(false);
  const [isApiConnected, setIsApiConnected] = useState(false);
  const [apiCredentials, setApiCredentials] = useState<{
    apiKey: string;
    secretKey: string;
    passphrase: string;
  } | null>(null);
  const [activeTrades, setActiveTrades] = useState<Trade[]>([]);
  const { toast } = useToast();

  const handleApiKeySet = (apiKey: string, secretKey: string, passphrase: string) => {
    setApiCredentials({ apiKey, secretKey, passphrase });
    setIsApiConnected(true);
  };

  const handleCreateTrade = (config: TradeConfig) => {
    // Simulate creating a trade with mock current price
    const mockCurrentPrice = Math.random() * 100000 + 20000; // Mock price between 20k-120k
    const newTrade: Trade = {
      id: Date.now().toString(),
      crypto: config.crypto,
      amount: parseFloat(config.amount),
      entryPrice: mockCurrentPrice,
      currentPrice: mockCurrentPrice * (1 + (Math.random() - 0.5) * 0.02), // +/- 1% variance
      takeProfitPercent: parseFloat(config.takeProfitPercent),
      trailingEnabled: config.enableTrailing,
      status: 'active',
      timestamp: new Date(),
    };

    setActiveTrades(prev => [...prev, newTrade]);
    toast({
      title: "Trade Created",
      description: `Successfully created ${config.crypto.replace('-USD', '')} trade for $${config.amount}`,
    });

    // Simulate price updates for demo
    const interval = setInterval(() => {
      setActiveTrades(prev => prev.map(trade => 
        trade.id === newTrade.id 
          ? {
              ...trade,
              currentPrice: trade.entryPrice * (1 + (Math.random() - 0.4) * 0.1) // Simulate price movement
            }
          : trade
      ));
    }, 3000);

    // Clean up after 30 seconds for demo
    setTimeout(() => clearInterval(interval), 30000);
  };

  const handleCancelTrade = (tradeId: string) => {
    setActiveTrades(prev => prev.filter(trade => trade.id !== tradeId));
    toast({
      title: "Trade Cancelled",
      description: "Trade has been successfully cancelled",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        onSettingsClick={() => setIsApiDialogOpen(true)}
        isApiConnected={isApiConnected}
      />
      
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <TradeConfigCard 
            onCreateTrade={handleCreateTrade}
            disabled={!isApiConnected}
          />
          <ActiveTradesCard 
            trades={activeTrades}
            onCancelTrade={handleCancelTrade}
          />
        </div>
      </main>

      <ApiKeyDialog
        open={isApiDialogOpen}
        onOpenChange={setIsApiDialogOpen}
        onApiKeySet={handleApiKeySet}
      />
    </div>
  );
};

export default Index;
