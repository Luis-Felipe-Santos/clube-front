import { isRef, type Ref } from "vue";

type ClubWithStatus = {
  id: number;
  status?: string;
};

type ClubSelectionTarget<T extends { clubeId?: number }> =
  | Ref<number | undefined>
  | T;

export function useActiveClubSelection<
  T extends ClubWithStatus,
  S extends { clubeId?: number },
>(selectedClub: ClubSelectionTarget<S>, clubs: Ref<T[]>) {
  const setSelectedClub = (clubId: number) => {
    if (isRef(selectedClub)) {
      selectedClub.value = clubId;
      return;
    }

    selectedClub.clubeId = clubId;
  };

  const ensureActiveClubSelected = () => {
    const currentSelectedClub = isRef(selectedClub)
      ? selectedClub.value
      : selectedClub.clubeId;

    if (currentSelectedClub) {
      return currentSelectedClub;
    }

    const activeClub =
      clubs.value.find((club) => club.status === "ATIVO") ?? clubs.value[0];

    if (!activeClub) {
      return undefined;
    }

    setSelectedClub(activeClub.id);
    return activeClub.id;
  };

  return {
    ensureActiveClubSelected,
  };
}
