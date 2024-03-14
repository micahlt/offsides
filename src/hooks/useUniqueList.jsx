import React from 'react';

export default function useUniqueList(list) {
  return React.useMemo(() => {
    return list.filter(
      ({ id }, i, _arr) => _arr.findIndex(elem => elem.id === id) === i,
    );
  }, [list]);
}
