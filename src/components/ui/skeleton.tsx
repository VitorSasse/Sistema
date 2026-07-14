import { classNames } from "@/lib/class-names";

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  return <span className={classNames("ui-skeleton", className)} aria-hidden="true" />;
}
