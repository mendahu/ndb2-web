type CheckboxButtonListProps<T> = {
  items: {
    name: string;
    value: T;
    label: string;
    checked: boolean;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  }[];
};

export const CheckboxButtonList = <
  T extends string | number | readonly string[] | undefined
>(
  props: CheckboxButtonListProps<T>
) => {
  return (
    <div className="w-full">
      <fieldset className={"flex w-full flex-col md:flex-row"}>
        {props.items.map((item, i) => {
          let classes = `before:border before:border-slate-400 before:dark:border-slate-600 peer-checked:before:border-moonstone-blue peer-checked:before:bg-moonstone-blue font-bold before:absolute before:left-0 before:right-0 before:top-0 before:-z-10 before:block before:h-full before:w-full before:dark:bg-slate-700 before:bg-slate-200`;

          if (i === 0) {
            classes +=
              " before:rounded-tl-lg before:rounded-tr-lg md:before:rounded-tr-none md:before:rounded-bl-lg";
          }

          if (i === props.items.length - 1) {
            classes +=
              " before:rounded-br-lg before:rounded-bl-lg md:before:rounded-bl-none md:before:rounded-tr-lg";
          }

          return (
            <div
              className={"relative flex grow px-6 py-3 md:justify-center"}
              key={item.name}
            >
              <input
                className={"peer absolute left-0 top-0 h-full w-full opacity-0"}
                type="checkbox"
                name={item.name}
                checked={item.checked}
                value={item.value}
                onChange={item.onChange}
              />
              <label htmlFor={item.name} className={classes}>
                {item.label.toUpperCase()}
              </label>
            </div>
          );
        })}
      </fieldset>
    </div>
  );
};
