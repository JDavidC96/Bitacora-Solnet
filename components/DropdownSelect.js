import { StyleSheet } from "react-native";
import { Dropdown } from "react-native-element-dropdown";

export default function DropdownSelect({
  data,
  value,
  onChange,
  placeholder = "Selecciona...",
  searchable = false,
}) {
  return (
    <Dropdown
      style={styles.dropdown}
      placeholderStyle={{ color: "#aaa" }}
      selectedTextStyle={{ color: "#000" }}
      data={data}
      search={searchable}
      labelField="label"
      valueField="value"
      placeholder={placeholder}
      value={value}
      // prueba ambas variantes
      onChangeItem={(item) => {
        console.log("onChangeItem:", item);
        onChange(item?.value ?? item);
      }}
      onChange={(item) => {
        console.log("onChange:", item);
        onChange(item?.value ?? item);
      }}
    />
  );
}

const styles = StyleSheet.create({
  dropdown: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
});
