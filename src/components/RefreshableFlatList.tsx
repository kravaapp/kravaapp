import { FlatList, FlatListProps } from "react-native";
import RefreshableScrollView from "./RefreshableScrollView";

type Props<T> = FlatListProps<T> & { refreshing: boolean; onRefresh: () => void; enabled?: boolean };

export default function RefreshableFlatList<T>({ refreshing, onRefresh, enabled, ...props }: Props<T>) {
  return (
    <FlatList
      {...props}
      refreshing={refreshing}
      onRefresh={onRefresh}
      renderScrollComponent={(scrollProps) => (
        <RefreshableScrollView {...scrollProps} refreshing={refreshing} onRefresh={onRefresh} enabled={enabled} />
      )}
    />
  );
}
