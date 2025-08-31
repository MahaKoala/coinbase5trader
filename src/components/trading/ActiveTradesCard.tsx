import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, TrendingUp, TrendingDown, X } from "lucide-react";

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

interface ActiveTradesCardProps {
  trades: Trade[];
  onCancelTrade: (tradeId: string) => void;
}

export const ActiveTradesCard = ({ trades, onCancelTrade }: ActiveTradesCardProps) => {
  const formatPrice = (price: number) => `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatPercentage = (current: number, entry: number) => {
    const change = ((current - entry) / entry) * 100;
    return {
      value: change.toFixed(2),
      isPositive: change >= 0
    };
  };

  return (
    <Card className="bg-gradient-dark border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Active Trades
        </CardTitle>
      </CardHeader>
      <CardContent>
        {trades.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No active trades</p>
            <p className="text-sm text-muted-foreground mt-1">
              Configure and create your first trade above
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {trades.map((trade) => {
              const pnl = formatPercentage(trade.currentPrice, trade.entryPrice);
              return (
                <div
                  key={trade.id}
                  className="p-4 bg-card rounded-lg border border-border"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{trade.crypto.replace('-USD', '')}</h3>
                      <Badge variant={trade.status === 'active' ? 'default' : 'secondary'}>
                        {trade.status}
                      </Badge>
                      {trade.trailingEnabled && (
                        <Badge variant="outline" className="text-primary border-primary">
                          Trailing
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onCancelTrade(trade.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Amount</p>
                      <p className="font-medium">${trade.amount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Entry Price</p>
                      <p className="font-medium">{formatPrice(trade.entryPrice)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Current Price</p>
                      <p className="font-medium">{formatPrice(trade.currentPrice)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">P&L</p>
                      <div className={`flex items-center gap-1 font-medium ${
                        pnl.isPositive ? 'text-success' : 'text-destructive'
                      }`}>
                        {pnl.isPositive ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                        {pnl.value}%
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Take Profit Target: {trade.takeProfitPercent}% • 
                      Created: {trade.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};