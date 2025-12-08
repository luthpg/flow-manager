import { Check } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card className="border-none shadow-none bg-background hover:bg-card transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group">
      <CardHeader>
        <div className="mb-4 inline-flex p-3 rounded-xl bg-muted/50 group-hover:bg-primary/10 transition-colors w-fit">
          {icon}
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="whitespace-pre-wrap text-base leading-relaxed">
          {description.replace(/\\n/g, '\n')}
        </CardDescription>
      </CardContent>
    </Card>
  );
}

export function UseCaseItem({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="mt-1 bg-primary/10 p-2 rounded-full h-fit">
        <Check className="w-5 h-5 text-primary" />
      </div>
      <div>
        <h3 className="font-bold text-lg">{title}</h3>
        <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed mt-1">
          {description.replace(/\\n/g, '\n')}
        </p>
      </div>
    </div>
  );
}
